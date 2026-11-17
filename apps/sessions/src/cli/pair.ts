import { Pairing } from "@sessions/protocol";
import { servePairing } from "../pairing";

export async function pair() {
  const code = Pairing.generateCode();
  console.log(`code: ${Pairing.formatCode(code)}`);
  console.log("paste it into the Sessions popup in your browser");
  console.log("the code is valid for 10 minutes");
  const paired = await servePairing(code);
  if (paired)
    console.log(`paired: ${paired.record.browser} (${paired.record.id})`);
  else console.log("no browser showed up");
}
