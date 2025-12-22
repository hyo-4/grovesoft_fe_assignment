import { createRouter, createWebHashHistory } from "vue-router";
import EventView from "./views/Event.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/event" },
    { path: "/event", component: EventView },
  ],
});

export default router;
