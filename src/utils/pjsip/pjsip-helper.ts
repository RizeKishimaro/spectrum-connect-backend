import { CreateAgentDto } from "src/agent/dto";
import { AgentPJSIPDTO } from "../dto/pjsip/pjsip-webrtc.dto";

export function buildPJSIPDTOFromCreateAgentData(data: CreateAgentDto): AgentPJSIPDTO {
  const sipUname = data.sipUname;
  const sipPassword = data.sipPassword;

  return {
    endpoint: {
      name: sipUname,
      config: {
        name: sipUname,
        type: "endpoint",
        auth: `${sipUname}-auth`,
        aors: sipUname,
        ...data.endpoint?.config,
      },
    },
    auth: {
      name: `${sipUname}-auth`,
      config: {
        name: `${sipUname}-auth`,
        type: "auth",
        auth_type: "userpass",
        username: sipUname,
        password: sipPassword,
        ...data.auth?.config,
      },
    },
    aor: {
      name: sipUname,
      config: {
        name: sipUname,
        type: "aor",
        max_contacts: 10,
        ...data.aor?.config,
      },
    },
  };
}
