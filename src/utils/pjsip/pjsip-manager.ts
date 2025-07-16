import { Injectable } from "@nestjs/common";
import { appendFile } from "fs";
import { RegisterDto } from "src/auth/dto/register.dto";

@Injectable()
export class PjsipService {
  private configPath = '/etc/asterisk/pjsip-agent.conf';

  async createWebRTCEndpoint(dto: { sipUser: string, sipPass: string }) {
    const { sipUser, sipPass } = dto;

    const block = `
[webrtc_${sipUser}](webrtc_endpoint_template)
auth=webrtc_auth_${sipUser}
aors=webrtc_aor_${sipUser}

[webrtc_auth_${sipUser}](auth_userpass_template)
username=${sipUser}
password=${sipPass}

[webrtc_aor_${sipUser}](webrtc_aor_template)
type=aors
`;


    appendFile(this.configPath, block.trim() + '\n\n', (err) => {
      if (err) throw err;
    });


    return {
      message: `🌐 WebRTC endpoint for ${sipUser} created successfully!`,
      config: block,
    };
  }
}

