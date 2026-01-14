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
            output = subprocess.check_output(["netstat", "-ano"], text=True, errors="ignore")
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
            text=True,
            errors="ignore"
        )
        return sorted({int(line.strip()) for line in output.splitlines() if line.strip().isdigit()})
    except FileNotFoundError:
        pass
    except subprocess.CalledProcessError:
        return []

    try:
        output = subprocess.check_output(["ss", "-ltnp"], text=True, errors="ignore")
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
        print("检测到 .nvmrc 文件...")
        if check_command("nvm"):
            print("正在切换 Node 版本到 20.19.6...")
            try:
                if platform.system() == "Windows":
                    # Windows 下 nvm 是批处理命令，需要特殊处理
                    subprocess.run("nvm use 20.19.6", shell=True, check=False)
                else:
                    # Unix 系统
                    subprocess.run(["nvm", "use", "20.19.6"], check=False)
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
        result = subprocess.run(["npm", "install"], check=False)
        if result.returncode != 0:
            print("✗ 依赖安装失败")
            sys.exit(1)
        print("✓ 依赖安装完成")
    else:
        print("✓ 依赖已安装")
    print()

def start_services():
    """启动服务"""
    print("正在启动服务...")
    print()
    
    system = platform.system()
    
    try:
        if system == "Windows":
            # Windows 系统
            print("启动后端服务...")
            subprocess.Popen(
                'start "Second Brain Backend" cmd /k "npm run server"',
                shell=True,
                cwd=os.getcwd()
            )
            
            print("等待后端启动...")
            time.sleep(3)
            
            print("启动前端服务...")
            subprocess.Popen(
                'start "Second Brain Frontend" cmd /k "npm run dev"',
                shell=True,
                cwd=os.getcwd()
            )
            
        elif system == "Darwin":  # macOS
            # macOS 系统
            print("启动后端服务...")
            subprocess.Popen(
                ['open', '-a', 'Terminal', '-n', '--args', 
                 'bash', '-c', 'cd "{}" && npm run server; exec bash'.format(os.getcwd())]
            )
            
            print("等待后端启动...")
            time.sleep(3)
            
            print("启动前端服务...")
            subprocess.Popen(
                ['open', '-a', 'Terminal', '-n', '--args', 
                 'bash', '-c', 'cd "{}" && npm run dev; exec bash'.format(os.getcwd())]
            )
            
        else:  # Linux
            # Linux 系统，尝试使用常见终端
            terminals = ['gnome-terminal', 'konsole', 'xterm']
            terminal = None
            for term in terminals:
                if check_command(term):
                    terminal = term
                    break
            
            if not terminal:
                print("⚠ 未找到图形终端，将在后台启动服务...")
                # 后台启动
                with open("backend.log", "w") as f:
                    subprocess.Popen(["npm", "run", "server"], 
                                   stdout=f, stderr=f)
                with open("frontend.log", "w") as f:
                    subprocess.Popen(["npm", "run", "dev"], 
                                   stdout=f, stderr=f)
                print("服务已在后台启动，日志文件：backend.log, frontend.log")
            else:
                print("启动后端服务...")
                if terminal == 'gnome-terminal':
                    subprocess.Popen([terminal, '--', 'bash', '-c', 
                                    'cd "{}" && npm run server; exec bash'.format(os.getcwd())])
                else:
                    subprocess.Popen([terminal, '-e', 
                                    'bash -c "cd {} && npm run server; exec bash"'.format(os.getcwd())])
                
                print("等待后端启动...")
                time.sleep(3)
                
                print("启动前端服务...")
                if terminal == 'gnome-terminal':
                    subprocess.Popen([terminal, '--', 'bash', '-c', 
                                    'cd "{}" && npm run dev; exec bash'.format(os.getcwd())])
                else:
                    subprocess.Popen([terminal, '-e', 
                                    'bash -c "cd {} && npm run dev; exec bash"'.format(os.getcwd())])
        
        print()
        print("=" * 50)
        print("✓ 服务启动成功！")
        print()
        print("后端服务: http://localhost:3000")
        print("前端服务: http://localhost:5173")
        print("=" * 50)
        print()
        print("提示：")
        print("- 两个新窗口已打开，分别运行后端和前端服务")
        print("- 请访问 http://localhost:5173 使用系统")
        print("- 关闭服务窗口即可停止服务")
        print()
        
    except Exception as e:
        print(f"✗ 启动失败: {e}")
        sys.exit(1)

def main():
    """主函数"""
    # 切换到项目根目录（脚本所在目录的上一级）
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)
    
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
