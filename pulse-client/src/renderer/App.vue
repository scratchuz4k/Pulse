<template>
  <RouterView v-slot="{ Component }">
    <Transition :name="transitionName" mode="out-in">
      <component :is="Component" :key="$route.name" />
    </Transition>
  </RouterView>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
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
