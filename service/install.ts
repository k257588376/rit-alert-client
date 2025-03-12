import { svc } from "./service.ts";

svc.on('install', function() {
  console.log("Service installed. Starting");
  svc.start();
});

svc.on("alreadyinstalled", () => {
  console.log("Service already installed");
});
  
svc.on("invalidinstallation", () => {
  console.log("Service invalid installation");
})

svc.install();