import { requestUrl } from "obsidian";
import {
  GOOGLE_AUTH_URL,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_TOKEN_URL,
  OAUTH_REDIRECT_URI,
} from "./constants";

export const generateAuthUrl = (clientId: string): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
};

export const exchangeCodeForTokens = async (
  code: string,
  clientId: string,
  clientSecret: string
): Promise<string> => {
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await requestUrl({
    url: GOOGLE_TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = response.json;

  if (!data.refresh_token) {
    throw new Error("No refresh token received");
  }

  return data.refresh_token;
};
