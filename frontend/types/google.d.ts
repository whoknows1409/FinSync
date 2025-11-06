// types/google.d.ts
export interface GoogleCredentialResponse {
  credential: string;
  clientId?: string;
  select_by?: string;
}

export interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  hosted_domain?: string;
  ux_mode?: 'popup' | 'redirect';
}

export interface GoogleButtonConfig {
  type?: 'standard';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number | string;
  locale?: string;
  click_listener?: () => void;
}

export interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (element: HTMLElement, config: GoogleButtonConfig) => void;
  prompt: (notification?: any) => void;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

export interface GoogleTokenClient {
  requestAccessToken: () => void;
}

export interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: any) => void;
  }) => GoogleTokenClient;
}

export interface GoogleAccounts {
  id: GoogleAccountsId;
  oauth2: GoogleOAuth2;
}

export interface GoogleWindow {
  google: {
    accounts: GoogleAccounts;
  };
}

declare global {
  interface Window extends GoogleWindow {}
}