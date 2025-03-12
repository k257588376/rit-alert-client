import { Service } from "node-windows";

export const svc = new Service({
  name: 'RIT.Alert',
  script: 'C:\\Users\\e.kulbeda\\alert.rit\\index.ts',
});