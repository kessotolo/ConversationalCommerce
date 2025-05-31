// Declare additional properties for the Axios module
declare module 'axios' {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}
