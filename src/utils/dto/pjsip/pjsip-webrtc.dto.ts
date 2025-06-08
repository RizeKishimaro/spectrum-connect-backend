
export interface PJSIPSectionDto {
  name: string;
  config: {
    [key: string]: string | number;
  };
}

export interface AgentPJSIPDTO {
  endpoint: PJSIPSectionDto;
  auth: PJSIPSectionDto;
  aor: PJSIPSectionDto;
}

