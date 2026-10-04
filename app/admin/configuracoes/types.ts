export interface OrganizationSettings {
  name: string
  support_email: string | null
  display_name: string | null
  phone: string | null
  website: string | null
  logo_url: string | null
  timezone: string | null
  language: string | null
  date_format: string | null
  time_format: string | null
}

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  name: "",
  support_email: null,
  display_name: null,
  phone: null,
  website: null,
  logo_url: null,
  timezone: null,
  language: null,
  date_format: null,
  time_format: null,
}
