import { Class, Course, User } from '@prisma/client'

interface ClassCreateData {
  name: string
  level: 'PRIMAIRE' | 'SECONDAIRE' | 'UNIVERSITAIRE'
  schoolId: string
  teacherId?: string
}

interface CourseCreateData {
  name: string
  classId: string
  teacherId: string
  dayOfWeek: 'LUNDI' | 'MARDI' | 'MERCREDI' | 'JEUDI' | 'VENDREDI' | 'SAMEDI' | 'DIMANCHE'
  startTime: string
  endTime: string
  program?: string
}

interface CourseUpdateData extends Partial<Omit<CourseCreateData, 'classId'>> {}

interface ClassResponse {
  data?: Class | Course | User[] | null
  error?: string
  status: number
}

const API_KEY = process.env.NEXT_PUBLIC_API_KEY

const handleResponse = async (response: Response): Promise<ClassResponse> => {
  const data = await response.json()
  
  if (!response.ok) {
    return {
      error: data.error || 'Une erreur est survenue',
      status: response.status
    }
  }

  return {
    data,
    status: response.status
  }
}

export const useClass = () => {
  const createClass = async (classData: ClassCreateData): Promise<ClassResponse> => {
    try {
      const response = await fetch('/api/class/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY || ''
        },
        body: JSON.stringify(classData)
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de la création de la classe',
        status: 500
      }
    }
  }

  const addCourse = async (courseData: CourseCreateData): Promise<ClassResponse> => {
    try {
      const response = await fetch('/api/class/add-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY || ''
        },
        body: JSON.stringify(courseData)
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de l\'ajout du cours',
        status: 500
      }
    }
  }

  const getClassCourses = async (classId: string): Promise<ClassResponse> => {
    try {
      const response = await fetch(`/api/class/get-courses?classId=${classId}`, {
        headers: {
          'x-api-key': API_KEY || ''
        }
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de la récupération des cours',
        status: 500
      }
    }
  }

  const getClassTeachers = async (classId: string): Promise<ClassResponse> => {
    try {
      const response = await fetch(`/api/class/get-teachers?classId=${classId}`, {
        headers: {
          'x-api-key': API_KEY || ''
        }
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de la récupération des professeurs',
        status: 500
      }
    }
  }

  const updateCourse = async (courseId: string, courseData: CourseUpdateData): Promise<ClassResponse> => {
    try {
      const response = await fetch(`/api/class/update-course?id=${courseId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY || ''
        },
        body: JSON.stringify(courseData)
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de la mise à jour du cours',
        status: 500
      }
    }
  }

  const deleteCourse = async (courseId: string): Promise<ClassResponse> => {
    try {
      const response = await fetch(`/api/class/delete-course?id=${courseId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': API_KEY || ''
        }
      })
      return handleResponse(response)
    } catch (error) {
      return {
        error: 'Erreur lors de la suppression du cours',
        status: 500
      }
    }
  }

  return {
    createClass,
    addCourse,
    getClassCourses,
    getClassTeachers,
    updateCourse,
    deleteCourse
  }
} 