<template>
  <div class="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-black text-white p-4">
    <div class="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
    <div class="w-full max-w-md relative z-10">
      <slot />
    </div>
  </div>
</template>