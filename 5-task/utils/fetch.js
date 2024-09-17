import { API } from "../const/api.js"
import { SESSION_STORAGE_ACCESS_TOKEN } from "../const/sessionStorage.js"

const { fetch: originalFetch } = window

export async function $fetch(...args) {
  let [resource, config] = args
  const token = sessionStorage.getItem(SESSION_STORAGE_ACCESS_TOKEN)

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "OData-MaxVersion": "4.0",
    "OData-Version": "4.0",
    "Content-Type": "application/json; charset=utf-8",
    Prefer: "odata.include-annotations=*",
  }

  resource = `${API}${resource}`

  const response = await originalFetch(resource, {
    ...config,
    headers: {
      ...config?.headers,
      ...headers,
    },
  })

  return response
}
