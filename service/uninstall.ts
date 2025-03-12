import { svc } from "./service.ts";

svc.on('uninstall',function(){
  console.log('Uninstall complete');
});

svc.on('alreadyuninstalled ',function(){
    console.log('Already uninstalled');
  });

svc.uninstall();