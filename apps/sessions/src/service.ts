import { Pairing } from "@sessions/protocol";
import { loadBrowsers } from "./state";

const browsers = await loadBrowsers();

export const mintCode = () => Pairing.formatCode(Pairing.generateCode());
