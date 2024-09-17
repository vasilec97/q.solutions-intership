import { APP_URL, AUTH_API, REDIRECT_URI } from "../const/api.js"
import { GET_TOKEN } from "../const/endpoints.js"
import { client_id, scope } from "../const/secrets.js"
import { SESSION_STORAGE_ACCESS_TOKEN } from "../const/sessionStorage.js"

const qp = new URLSearchParams(window.location.search)
const authorizationCode = qp.get("code")

if (authorizationCode) {
  exchangeCodeForToken(authorizationCode)
}

async function exchangeCodeForToken(authorizationCode) {
  const codeVerifier = sessionStorage.getItem("code_verifier")

  const tokenUrl = `${AUTH_API}${GET_TOKEN}`

  const body = new URLSearchParams({
    client_id,
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
    scope: scope,
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  })

  const data = await response.json()

  if (data.access_token) {
    sessionStorage.setItem(SESSION_STORAGE_ACCESS_TOKEN, data.access_token)

    window.location.href = APP_URL
  } else {
    console.error("Error fetching token:", data)
  }
}
