import { defineStore } from 'pinia'
import api from '../utils/api'

export const useResearchStore = defineStore('research', {
  state: () => ({
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0
    },
    filters: {
      status: ''
    }
  }),

  getters: {
    projectById: (state) => (id) => {
      return state.projects.find(p => p.id === parseInt(id))
    }
  },

  actions: {
    async fetchProjects() {
      this.loading = true
      this.error = null
      try {
        const params = {
          page: this.pagination.page,
          limit: this.pagination.limit
        }
        if (this.filters.status) {
          params.status = this.filters.status
        }

        const response = await api.get('/api/research/projects', { params })
        this.projects = response.data.data
        this.pagination.total = response.data.total
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Fetch research projects error:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchProjectDetail(id) {
      this.loading = true
      this.error = null
      try {
        const response = await api.get(`/api/research/projects/${id}`)
        this.currentProject = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Fetch project detail error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createProject(data) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/api/research/projects', data)
        await this.fetchProjects()
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Create project error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateProject(id, data) {
      this.loading = true
      this.error = null
      try {
        await api.put(`/api/research/projects/${id}`, data)
        await this.fetchProjects()
        if (this.currentProject && this.currentProject.id === id) {
          await this.fetchProjectDetail(id)
        }
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Update project error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteProject(id) {
      this.loading = true
      this.error = null
      try {
        await api.delete(`/api/research/projects/${id}`)
        await this.fetchProjects()
        if (this.currentProject && this.currentProject.id === id) {
          this.currentProject = null
        }
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Delete project error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async analyzeRequirements(projectId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post(`/api/research/projects/${projectId}/analyze-requirements`)
        await this.fetchProjectDetail(projectId)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Analyze requirements error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async answerQuestion(projectId, questionId, answer) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post(`/api/research/projects/${projectId}/questions`, {
          questionId,
          answer
        })
        await this.fetchProjectDetail(projectId)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Answer question error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async collectMaterials(projectId, scope = 'local') {
      this.loading = true
      this.error = null
      try {
        const response = await api.post(`/api/research/projects/${projectId}/collect-materials`, {
          scope
        })
        await this.fetchProjectDetail(projectId)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Collect materials error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async processMaterials(projectId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post(`/api/research/projects/${projectId}/process-materials`)
        await this.fetchProjectDetail(projectId)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Process materials error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchKnowledgeGraph(projectId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.get(`/api/research/projects/${projectId}/knowledge-graph`)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Fetch knowledge graph error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async generateReport(projectId) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post(`/api/research/projects/${projectId}/generate-report`)
        await this.fetchProjectDetail(projectId)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Generate report error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchMaterials(projectId, params = {}) {
      this.loading = true
      this.error = null
      try {
        const response = await api.get(`/api/research/projects/${projectId}/materials`, { params })
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || error.message
        console.error('Fetch materials error:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    updateFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      this.pagination.page = 1
      this.fetchProjects()
    },

    loadMore() {
      if (this.pagination.page * this.pagination.limit < this.pagination.total) {
        this.pagination.page++
        this.fetchProjects()
      }
    }
  }
})
