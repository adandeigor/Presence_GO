import { useAuthContext } from '@/context/useAuthContext'

const baseUrl = process.env.NEXT_PUBLIC_API_URL

interface PaginationParams {
  page?: number
  limit?: number
  orderBy?: string
  order?: 'asc' | 'desc'
}

interface Child {
  id: string
  name: string | null
  email: string
  studentId: string | null
  class: {
    id: string
    name: string
    courses: Array<{
      id: string
      name: string
    }>
  } | null
  school: {
    id: string
    name: string
  } | null
}

interface ParentChildResponse {
  child: Child
  id: string
  parentId: string
  childId: string
  createdAt: string
}

interface PaginatedChildrenResponse {
  data: Child[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface UserInfo {
  id: string
  name: string | null
  email: string
  role: string
}

const BaseRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const { sessionToken } = useAuthContext()
  
  if (!sessionToken) {
    throw new Error("Session non disponible")
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessionToken}`
  }

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Une erreur s'est produite")
    }

    return data
  } catch (error) {
    console.error('[PARENT_CHILD_REQUEST_ERROR]', error)
    throw error
  }
}

export const useParentChild = () => {
  const { sessionToken } = useAuthContext()

  const getUserInfo = async (): Promise<UserInfo | null> => {
    if (!sessionToken) return null
    try {
      const response = await BaseRequest('/api/auth/me')
      return response.user
    } catch (error) {
      console.error('[GET_USER_INFO_ERROR]', error)
      return null
    }
  }

  const linkChild = async (studentId: string): Promise<ParentChildResponse> => {
    const userInfo = await getUserInfo()
    if (!userInfo?.id) {
      throw new Error("Utilisateur non connecté")
    }

    return BaseRequest('/api/parent-child/link', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        parentId: userInfo.id
      })
    })
  }

  const unlinkChild = async (childId: string): Promise<{ message: string }> => {
    const userInfo = await getUserInfo()
    if (!userInfo?.id) {
      throw new Error("Utilisateur non connecté")
    }

    return BaseRequest(`/api/parent-child/unlink?parentId=${userInfo.id}&childId=${childId}`, {
      method: 'DELETE'
    })
  }

  const getChildren = async (params?: PaginationParams): Promise<PaginatedChildrenResponse> => {
    const userInfo = await getUserInfo()
    if (!userInfo?.id) {
      throw new Error("Utilisateur non connecté")
    }

    const queryParams = new URLSearchParams({
      parentId: userInfo.id,
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.orderBy && { orderBy: params.orderBy }),
      ...(params?.order && { order: params.order })
    })

    return BaseRequest(`/api/parent-child/get-children?${queryParams.toString()}`)
  }

  const isParentOf = async (childId: string): Promise<boolean> => {
    try {
      const userInfo = await getUserInfo()
      if (!userInfo?.id) {
        return false
      }

      const children = await getChildren()
      return children.data.some(child => child.id === childId)
    } catch (error) {
      console.error('[IS_PARENT_OF_ERROR]', error)
      return false
    }
  }

  return {
    linkChild,
    unlinkChild,
    getChildren,
    isParentOf
  }
}

export type { Child, PaginatedChildrenResponse, ParentChildResponse } 