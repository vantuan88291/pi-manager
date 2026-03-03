export interface TelegramUser {
  id: number
  firstName: string
  lastName?: string
  username?: string
  photoUrl?: string
  languageCode?: string
}

export interface AuthSuccessPayload {
  user: TelegramUser
  sessionToken: string
}
