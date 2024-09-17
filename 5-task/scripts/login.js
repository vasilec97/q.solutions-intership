import { REDIRECT_URI, AUTH_API } from "../const/api.js"
import { AUTHORIZE } from "../const/endpoints.js"
import { client_id, scope } from "../const/secrets.js"
import {
  SESSION_STORAGE_ACCESS_TOKEN,
  SESSION_STORAGE_CODE_VERIFIER,
} from "../const/sessionStorage.js"

const $dialogueSection = document.querySelector(".dialogue")
const $loginSection = document.querySelector(".login")
const $logInBtn = document.querySelector(".btn-login")

$logInBtn.addEventListener("click", async function () {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  sessionStorage.setItem(SESSION_STORAGE_CODE_VERIFIER, codeVerifier)

  const qp = new URLSearchParams({
    client_id,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: encodeURIComponent(scope),
    response_mode: "query",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  const authUrl = `${AUTH_API}${AUTHORIZE}?${qp.toString()}`

  window.location.href = authUrl
})

export function initUser() {
  const token = sessionStorage.getItem(SESSION_STORAGE_ACCESS_TOKEN)

  token ? hideLogin() : hideDialogue()
}

function hideLogin() {
  $loginSection.classList.add("hide")
}

function hideDialogue() {
  $dialogueSection.classList.add("hide")
}

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

function base64UrlEncode(arrayBuffer) {
  const base64String = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
  return base64String
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await window.crypto.subtle.digest("SHA-256", data)
  return base64UrlEncode(digest)
}
