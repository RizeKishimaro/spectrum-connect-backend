
import { Agi } from 'ts-agi';
import { CallService } from 'src/call/call.service';
import { AgentService } from 'src/agent/agent.service';

export function createAgiServer(
  callService: CallService,
  agentService: AgentService
) {
  const agi = new Agi();

  agi.use(async (ctx, next) => {
    const callerId = ctx.variables['callerid'] || 'unknown';
    // await ctx.answer();

    console.log(`📞💫 AGI Call from ${callerId}`);

    const session = await callService.logCall(callerId, 'incoming-call');

    const agent = await agentService.getAvailableAgent();
    console.log('Available Agent:', agent);
    if (!agent) {
      await ctx.controlStreamFile('all-circuits-busy-now');
      await callService.updateCallStatus(session.id, 'FAILED');
      return ctx.hangup();
    }

    await agentService.updateStatus(agent.id, 'RINGING');

    await ctx.exec('StartMusicOnHold');

    const dialResult = await ctx.exec('Dial', `${agent.sipUri}`);


    await ctx.exec('StopMusicOnHold');

    console.log('Dial Result:', dialResult);

    const dialStatusResult = await ctx.getVariable('DIALSTATUS');
    console.log('DIALSTATUS Result:', dialStatusResult);

    if (dialStatusResult && Number(dialStatusResult.code) === 200) {
      const dialStatus = dialStatusResult.value || dialStatusResult.result;
      console.log('DIALSTATUS Value:', dialStatus);

      if (dialStatus === 'ANSWER') {
        await agentService.updateStatus(agent.id, 'BUSY');
        await callService.updateCallStatus(session.id, 'CONNECTED');
      } else {
        await agentService.updateStatus(agent.id, 'AVAILABLE');
        await callService.updateCallStatus(session.id, 'FAILED');
        await ctx.controlStreamFile('goodbye');
      }
    } else {
      console.error('Failed to retrieve DIALSTATUS');
      await agentService.updateStatus(agent.id, 'AVAILABLE');
      await callService.updateCallStatus(session.id, 'FAILED');
      await ctx.controlStreamFile('goodbye');
    }

    await next();
  });

  agi.listen(4573, () => {
    console.log('🌸 AGI Server running on port 4573 uwu~ ✨');
  });
}

