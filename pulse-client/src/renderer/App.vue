<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="$route.name" />
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLiveKit } from "./composables/useLiveKit";
import { usePtt } from "./composables/usePtt";
import { usePresence } from "./composables/usePresence";

const router = useRouter();
const { setMainMicEnabled } = useLiveKit();
const { isPttMode } = usePtt();
const { broadcastMuteChanged } = usePresence();

onMounted(() => {
  window.pulseApi.onPttKeyDown(() => {
    console.log("onPttKeyDown received in App.vue");
    if (!isPttMode.value) return;
    setMainMicEnabled(true);
    broadcastMuteChanged(false);
  });
  window.pulseApi.onPttKeyUp(() => {
    console.log("PttKeyUp received in App.vue");
    if (!isPttMode.value) return;
    setMainMicEnabled(false);
    broadcastMuteChanged(true);
  });
});
const prevRouteName = ref<string | null>(null);
const currRouteName = ref<string | null>(null);

router.afterEach((to, from) => {
  prevRouteName.value = from.name as string | null;
  currRouteName.value = to.name as string | null;
});

const transitionName = computed(() =>
  currRouteName.value === "dashboard" ? "page" : "",
);
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: scale(0.97);
}
.page-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
