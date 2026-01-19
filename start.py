#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Second Brain System Startup Script
外挂大脑启动脚本
"""

import os
import sys
import subprocess
import time
import platform
import signal

# 设置 Windows 控制台 UTF-8 编码
if platform.system() == "Windows":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def print_header():
    """打印启动标题"""
    print("=" * 50)
    print("Second Brain System Startup")
    print("外挂大脑启动")
    print("=" * 50)
    print()

def check_command(command):
    """检查命令是否存在"""
    try:
        subprocess.run([command, "--version"], 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL,
                      check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def find_listening_pids(port):
    system = platform.system()
    if system == "Windows":
        try:
            output = subprocess.check_output(["netstat", "-ano"], universal_newlines=True, errors="ignore")
        except Exception as e:
            print(f"Warning: failed to check port {port}: {e}")
            return []
        pids = set()
        for line in output.splitlines():
            parts = line.split()
            if len(parts) < 5:
                continue
            if parts[0].upper() != "TCP":
                continue
            local = parts[1]
            state = parts[3].upper()
            pid = parts[4]
            if state != "LISTENING":
                continue
            if local.endswith(f":{port}") and pid.isdigit() and pid != "0":
                pids.add(int(pid))
        return sorted(pids)

    try:
        output = subprocess.check_output(
            ["lsof", "-nP", f"-iTCP:{port}", "-sTCP:LISTEN", "-t"],
            universal_newlines=True,
            errors="ignore"
        )
        return sorted({int(line.strip()) for line in output.splitlines() if line.strip().isdigit()})
    except FileNotFoundError:
        pass
    except subprocess.CalledProcessError:
        return []

    try:
        output = subprocess.check_output(["ss", "-ltnp"], universal_newlines=True, errors="ignore")
    except Exception:
        return []

    pids = set()
    for line in output.splitlines():
        if f":{port}" not in line or "pid=" not in line:
            continue
        for part in line.split("pid=")[1:]:
            digits = ""
            for ch in part:
                if ch.isdigit():
                    digits += ch
                else:
                    break
            if digits:
                pids.add(int(digits))
    return sorted(pids)

def free_ports(ports):
    print("Releasing ports:", ", ".join(str(port) for port in ports))
    killed = set()
    for port in ports:
        pids = find_listening_pids(port)
        if not pids:
            print(f"Port {port} is free.")
            continue
        for pid in pids:
            if pid in killed:
                continue
            killed.add(pid)
            print(f"Stopping process {pid} on port {port}...")
            if platform.system() == "Windows":
                subprocess.run(["taskkill", "/PID", str(pid), "/F"], check=False)
            else:
                try:
                    os.kill(pid, signal.SIGTERM)
                except Exception as e:
                    print(f"Warning: failed to stop pid {pid}: {e}")
    if killed:
        time.sleep(1)

def switch_node_version():
    """切换 Node.js 版本"""
    if os.path.exists(".nvmrc"):
        target_version = "20.19.6"
        try:
            current_version = subprocess.check_output(["node", "-v"], universal_newlines=True).strip().lstrip('v')
        except:
            current_version = None

        if current_version == target_version:
            print(f"✓ Node 版本已是 {target_version}")
            print()
            return

        print("检测到 .nvmrc 文件...")
        if check_command("nvm"):
            print(f"正在切换 Node 版本到 {target_version}...")
            try:
                if platform.system() == "Windows":
                    # Windows 下 nvm 是批处理命令，需要特殊处理
                    subprocess.run(f"nvm use {target_version}", shell=True, check=False)
                else:
                    # Unix 系统
                    subprocess.run(["nvm", "use", target_version], check=False)
                print("✓ Node 版本切换完成")
                time.sleep(1)
            except Exception as e:
                print(f"⚠ Node 版本切换失败: {e}")
        print()

def check_environment():
    """检查运行环境"""
    print("检查运行环境...")
    
    # 检查 Node.js
    if not check_command("node"):
        print("✗ 错误: 未检测到 Node.js")
        print("请先安装 Node.js (https://nodejs.org/)")
        sys.exit(1)
    print("✓ Node.js 已安装")
    
    # 检查 npm（Windows 下跳过，因为 nvm 切换后可能导致环境变量问题）
    if platform.system() != "Windows":
        if not check_command("npm"):
            print("✗ 错误: 未检测到 npm")
            sys.exit(1)
        print("✓ npm 已安装")
    else:
        print("✓ npm 已安装（随 Node.js一起）")
    
    # 检查依赖
    if not os.path.exists("node_modules"):
        print("\n首次运行，正在安装依赖...")
        use_shell = platform.system() == "Windows"
        if use_shell:
            # Windows 下使用 shell=True
            result = subprocess.run("npm install", shell=True, check=False)
        else:
            result = subprocess.run(["npm", "install"], check=False)
            
        if result.returncode != 0:
            print("✗ 依赖安装失败")
            sys.exit(1)
        print("✓ 依赖安装完成")
    else:
        print("✓ 依赖已安装")
    print()

import threading

def stream_reader(pipe, prefix, color_code):
    """读取流并在每行前添加前缀"""
    try:
        for line in iter(pipe.readline, ''):
            if not line:
                break
            # 移除行尾的换行符
            line = line.rstrip()
            if line:
                # 使用 ANSI 颜色代码
                print(f"\033[{color_code}m[{prefix}] {line}\033[0m")
    except Exception:
        pass

def start_services():
    """启动服务"""
    print("正在启动服务...")
    print()
    
    system = platform.system()
    
    # 启用 ANSI 颜色支持（Windows 10+）
    if system == "Windows":
        os.system('')
        
    try:
        # 定义命令
        # Windows 上 npm 是 cmd 脚本，需要 shell=True
        # 其他系统直接运行
        backend_cmd = "npm run server"
        frontend_cmd = "npm run dev"
        
        use_shell = True
        
        print("启动后端服务...")
        backend_proc = subprocess.Popen(
            backend_cmd,
            shell=use_shell,
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace' # 防止编码错误
        )
        
        print("启动前端服务...")
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            shell=use_shell,
            cwd=os.getcwd(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True,
            bufsize=1,
            encoding='utf-8',
            errors='replace'
        )
        
        # 启动读取线程
        # 36 = Cyan (Backend), 32 = Green (Frontend)
        t_backend = threading.Thread(target=stream_reader, args=(backend_proc.stdout, "Backend", "36"), daemon=True)
        t_frontend = threading.Thread(target=stream_reader, args=(frontend_proc.stdout, "Frontend", "32"), daemon=True)
        
        t_backend.start()
        t_frontend.start()
        
        print()
        print("=" * 50)
        print("✓ 服务启动成功！")
        print()
        print("后端服务: http://localhost:3000")
        print("前端服务: http://localhost:5173")
        print("=" * 50)
        print()
        print("提示：")
        print("- 服务正在当前窗口运行")
        print("- 按 Ctrl+C 可停止所有服务并退出")
        print()
        
        # 等待服务运行，直到被中断
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("⚠ 后端服务已停止")
                break
            if frontend_proc.poll() is not None:
                print("⚠ 前端服务已停止")
                break
                
    except KeyboardInterrupt:
        print("\n\n正在停止服务...")
    except Exception as e:
        print(f"✗ 启动失败: {e}")
    finally:
        # 终止子进程
        # Windows 上杀掉进程树
        if 'backend_proc' in locals() and backend_proc:
            if system == "Windows":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(backend_proc.pid)], 
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                backend_proc.terminate()
                
        if 'frontend_proc' in locals() and frontend_proc:
            if system == "Windows":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_proc.pid)], 
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                frontend_proc.terminate()
        
        sys.exit(0)

def main():
    """主函数"""
    # 切换到项目根目录
    # 如果脚本在根目录，直接使用当前目录
    # 如果脚本在 scripts 目录，切换到上一级
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 判断当前目录是否是 scripts
    if os.path.basename(script_dir) == 'scripts':
        project_root = os.path.dirname(script_dir)
        os.chdir(project_root)
    elif os.path.exists(os.path.join(script_dir, 'package.json')):
        # 已经在根目录
        os.chdir(script_dir)
    else:
        # 尝试切换到脚本所在目录，再判断
        os.chdir(script_dir)
        if os.path.exists('../package.json'):
             os.chdir('..')

    print(f"工作目录: {os.getcwd()}")
    
    print_header()
    switch_node_version()
    check_environment()
    free_ports([3000, 5173])
    start_services()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n操作已取消")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ 发生错误: {e}")
        sys.exit(1)
