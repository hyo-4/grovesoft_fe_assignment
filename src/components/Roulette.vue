<template>
  <div class="roulette">
    <div
      class="roulette__result"
      :class="{ 'roulette__result--show': !isSpinning && selectedReward }"
    >
      <p v-if="selectedReward">
        축하합니다! <span class="roulette__result-em">{{ selectedReward.name }}</span> 당첨!
      </p>
      <p v-else>행운을 빌어요!</p>
      <div v-if="showWinOverlay" class="roulette__overlay" aria-hidden="true">
        <DotLottieVue class="roulette__overlay-lottie" autoplay loop :src="lottieSrc" />
      </div>
    </div>

    <div
      class="roulette__wheel-wrap"
      :class="{ 'roulette__wheel-wrap--locked': props.disabled }"
      :style="rouletteStyle"
    >
      <svg viewBox="0 0 100 100" class="roulette__wheel">
        <g v-for="(reward, index) in rewards" :key="reward.id">
          <path
            :d="getArcPath(index)"
            :fill="index % 2 === 0 ? '#ffffff' : '#f1f2f6'"
            stroke="#dfe4ea"
            stroke-width="0.2"
          />
          <g :transform="getTextTransform(index)">
            <text
              x="30"
              y="0"
              font-size="3.5"
              font-weight="600"
              fill="#2f3542"
              text-anchor="middle"
              dominant-baseline="middle"
              transform="rotate(0)"
            >
              {{ reward.name }}
            </text>
          </g>
        </g>
        <circle cx="50" cy="50" r="4" fill="#2f3542" />
      </svg>
    </div>

    <div class="roulette__arrow"></div>

    <button
      v-if="!selectedReward"
      class="roulette__button"
      :disabled="isSpinning || props.disabled"
      @click="spinWheel"
    >
      {{ isSpinning ? "회전 중..." : props.disabled ? "응모 후 참여 가능" : "START" }}
    </button>

    <!-- 공유 버튼 (룰렛 종료 후) -->
    <button v-else class="roulette__button roulette__button--share" @click="shareUrl">
      결과 공유하기 🔗
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, type CSSProperties, onBeforeUnmount } from "vue";
  import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

  const showWinOverlay = ref(false);
  const overlayTimer = ref<number | null>(null);

  const lottieSrc = "https://lottie.host/2b7cc1f7-b5e2-4fb6-9a03-6fc8d9ab5491/m6SZDvZHEq.lottie";

  export type Reward = {
    id: number;
    name: string;
    image: string;
  };

  interface Props {
    rewards: Reward[];
    disabled: boolean;
    alreadyDone: boolean;
  }

  const props = defineProps<Props>();
  const emit = defineEmits<{ (e: "result", reward: Reward): void }>();

  const isSpinning = ref(false);
  const rotation = ref(0);
  const selectedReward = ref<Reward | null>(null);
  const transitionDuration = 4;

  const rouletteStyle = computed(
    (): CSSProperties => ({
      transform: `rotate(${rotation.value}deg)`,
      transition: isSpinning.value
        ? `transform ${transitionDuration}s cubic-bezier(0.15, 0, 0.15, 1)`
        : "none",
    })
  );

  const rewards = computed(() => props.rewards ?? []);
  const segmentAngle = computed(() => 360 / Math.max(rewards.value.length, 1));

  const getArcPath = (index: number) => {
    const angle = segmentAngle.value;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const x1 = 50 + 50 * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = 50 + 50 * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = 50 + 50 * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = 50 + 50 * Math.sin((Math.PI * (endAngle - 90)) / 180);

    return `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;
  };

  const getTextTransform = (index: number) => {
    const angle = segmentAngle.value * index + segmentAngle.value / 2;
    return `rotate(${angle}, 50, 50) translate(20, 15)`;
  };

  const spinWheel = () => {
    if (isSpinning.value) return;
    if (props.disabled) return;
    if (rewards.value.length === 0) return;

    selectedReward.value = null;
    isSpinning.value = true;
    showWinOverlay.value = false;

    const randomSpin = Math.floor(Math.random() * 360);
    const totalRotation = rotation.value + 360 * 8 + randomSpin;

    rotation.value = totalRotation;

    window.setTimeout(() => {
      isSpinning.value = false;
      calculateResult(totalRotation);
    }, transitionDuration * 1000);
  };

  const calculateResult = (totalRotation: number) => {
    const actualDegree = totalRotation % 360;
    const idx = Math.floor((360 - actualDegree) / segmentAngle.value) % rewards.value.length;
    const winner = rewards.value[idx];

    selectedReward.value = winner!;
    emit("result", winner!);
    triggerOverlayOnce();
  };

  function triggerOverlayOnce() {
    if (overlayTimer.value) window.clearTimeout(overlayTimer.value);

    showWinOverlay.value = true;

    overlayTimer.value = window.setTimeout(() => {
      showWinOverlay.value = false;
      overlayTimer.value = null;
    }, 1600);
  }

  const shareUrl = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      alert("URL이 복사되었습니다!");
    } catch {
      alert("URL 복사에 실패했어요 😢");
    }
  };

  onBeforeUnmount(() => {
    if (overlayTimer.value) window.clearTimeout(overlayTimer.value);
  });
</script>

<style lang="scss" scoped>
  .roulette {
    position: relative;
    width: 320px;
    margin: 40px auto;
    text-align: center;

    &__result {
      height: 60px;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 1.2rem;
      font-weight: 700;
      opacity: 0;
      transition: opacity 0.5s ease;
      white-space: nowrap;

      &--show {
        opacity: 1;
      }
    }

    &__result-em {
      color: #ff4757;
      font-size: 1.4rem;
    }

    &__wheel-wrap {
      width: 300px;
      height: 300px;
      border-radius: 50%;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
      will-change: transform;
      transform-origin: 50% 50%;
      overflow: hidden;

      &--locked {
        opacity: 0.6;
        filter: grayscale(0.2);
        pointer-events: none;
      }
    }

    &__wheel {
      width: 100%;
      height: 100%;
      display: block;
    }

    &__overlay {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    &__overlay-lottie {
      width: 500px;
      height: 500px;
    }

    @keyframes pop {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    &__arrow {
      position: absolute;
      top: 50px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 12px solid transparent;
      border-right: 12px solid transparent;
      border-top: 24px solid #ff4757;
      z-index: 10;
    }

    &__button {
      margin-top: 30px;
      padding: 15px 40px;
      background: #2f3542;
      color: #fff;
      border: none;
      border-radius: 30px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform 0.2s ease,
        filter 0.2s ease;
      user-select: none;

      &:active {
        transform: scale(0.95);
      }

      &:disabled {
        background: #a4b0be;
        cursor: not-allowed;
      }

      &--share {
        background: #1f6feb;
      }
    }

    @media (max-width: 760px) {
      width: 280px;

      &__wheel-wrap {
        width: 260px;
        height: 260px;
      }

      &__arrow {
        top: 40px;
        border-left-width: 10px;
        border-right-width: 10px;
        border-top-width: 20px;
      }

      &__button {
        padding: 14px 34px;
      }
    }
  }
</style>
