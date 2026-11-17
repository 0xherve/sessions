import { connect } from "./client";

export async function pair() {
  const { peer, close } = await connect();
  const code = await peer.request("pair.begin", null, 5000);
  console.log(`code: ${code}`);
  console.log("paste it into the Sessions popup in your browser");
  close();
}
