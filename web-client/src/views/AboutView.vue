<script setup>
  import SrBuildDate from '@/components/SrBuildDate.vue';
</script>

<template>
  <div class="sr-about">
    <SrBuildDate />
  </div>
</template>

<style scoped>
@media (min-width: 1024px) {
  .sr-about {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
