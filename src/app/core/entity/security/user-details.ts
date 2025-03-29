export interface GrantedAuthority {
  authority: string;
}

export interface UserDetails {
  username: string;
  password: string | null;
  authorities: GrantedAuthority[];
  enabled: boolean;
}
