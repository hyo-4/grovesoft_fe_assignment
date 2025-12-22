<template>
  <div class="roulette-container">
    <div class="result-display" :class="{ show: !isSpinning && selectedReward }">
      <p v-if="selectedReward">
        축하합니다! <span>{{ selectedReward.name }}</span> 당첨!
      </p>
      <p v-else>행운을 빌어요!</p>
    </div>

    <div class="roulette-wrapper" :style="rouletteStyle">
      <svg viewBox="0 0 100 100" class="roulette-wheel">
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

    <div class="roulette-arrow"></div>

    <button class="spin-button" :disabled="isSpinning" @click="spinWheel">
      {{ isSpinning ? "회전 중..." : "START" }}
    </button>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, type CSSProperties } from "vue";

  export type Reward = {
    id: number;
    name: string;
    image: string;
  };

  interface Props {
    rewards: Reward[];
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

  const segmentAngle = computed(() => 360 / props.rewards.length);

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

    selectedReward.value = null; // 이전 결과 초기화
    isSpinning.value = true;

    const randomSpin = Math.floor(Math.random() * 360);
    const totalRotation = rotation.value + 360 * 8 + randomSpin; // 8바퀴 회전

    rotation.value = totalRotation;

    setTimeout(() => {
      isSpinning.value = false;
      calculateResult(totalRotation);
    }, transitionDuration * 1000);
  };

  const calculateResult = (totalRotation: number) => {
    const actualDegree = totalRotation % 360;
    const rewardIndex =
      Math.floor((360 - actualDegree) / segmentAngle.value) % props.rewards.length;

    const winner = props.rewards[rewardIndex];
    selectedReward.value = winner!;
    emit("result", winner!);
  };
</script>

<style scoped>
  .roulette-container {
    position: relative;
    width: 320px;
    margin: 40px;
    text-align: center;
    justify-content: center;
  }

  .result-display {
    height: 60px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.2rem;
    font-weight: bold;
    opacity: 0;
    transition: opacity 0.5s ease;
  }

  .result-display.show {
    opacity: 1;
  }

  .result-display span {
    color: #ff4757;
    font-size: 1.4rem;
  }

  .roulette-wrapper {
    width: 300px;
    height: 300px;
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }

  .roulette-arrow {
    position: absolute;
    top: 50px;
    left: 47%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 24px solid #ff4757;
    z-index: 10;
  }

  .spin-button {
    margin-top: 30px;
    padding: 15px 40px;
    background: #2f3542;
    color: white;
    border: none;
    border-radius: 30px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .spin-button:active {
    transform: scale(0.95);
  }

  .spin-button:disabled {
    background: #a4b0be;
  }
</style>
