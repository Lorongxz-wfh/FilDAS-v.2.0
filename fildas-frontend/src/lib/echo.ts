import Echo from "laravel-echo";
import Pusher from "pusher-js";

import api from "../services/api";

(window as any).Pusher = Pusher;

let authQueue: Promise<any> = Promise.resolve();

const echo = new Echo({
  broadcaster: "pusher",
  key: import.meta.env.VITE_PUSHER_APP_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: true,
  authorizer: (channel: any) => ({
    authorize: (socketId: string, callback: any) => {
      // Chain auth requests to prevent parallel connection collision
      authQueue = authQueue.then(() => 
        new Promise((resolve) => {
          api
            .post("/broadcasting/auth", {
              socket_id: socketId,
              channel_name: channel.name,
            })
            .then((res) => {
              callback(false, res.data);
              // Small stagger between auth calls to clear the pipe
              setTimeout(resolve, 50);
            })
            .catch((err) => {
              callback(true, err);
              resolve(null);
            });
        })
      );
    },
  }),
});

export default echo;
