<template>
  <main class="event-page" @scroll.passive="onScroll">
    <Transition name="fade">
      <div v-if="eventState.loading" class="event-page__overlay">
        <div class="event-page__spinner-container">
          <div class="event-page__spinner"></div>
          <p class="event-page__loading-text">잠시만 기다려주세요...</p>
        </div>
      </div>
    </Transition>

    <header class="event-page__hero">
      <p class="event-page__badge">신규 서비스 오픈 기념</p>
      <h1 class="event-page__title">{{ eventState.data?.title ?? "이벤트 로딩 중..." }}</h1>
      <p class="event-page__desc">{{ eventState.data?.description ?? "" }}</p>

      <div class="event-page__hero-meta">
        <div class="event-page__meta-item">
          <span class="event-page__meta-label">종료 날짜</span>
          <span class="event-page__meta-value">{{ periodText }}</span>
        </div>

        <div class="event-page__meta-item">
          <span class="event-page__meta-label">남은 시간</span>
          <span
            class="event-page__meta-value event-page__meta-value--timer"
            :class="{ 'event-page__ended': countdown.ended }"
          >
            <template v-if="eventState.data">
              {{ countdownText }}
            </template>
            <template v-else>--</template>
          </span>
        </div>
      </div>
    </header>

    <!-- 상태 UI: 로딩 or 에러일 때만 렌더링 -->
    <section
      class="event-page__container"
      v-if="eventState.loading || eventState.error"
      data-reveal
    >
      <div v-if="eventState.loading" class="event-page__status">이벤트 정보를 불러오는 중...</div>

      <div v-else class="event-page__status event-page__status--error">
        불러오기 실패: {{ eventState.error }}
        <button class="event-page__link" @click="loadEvent">다시 시도</button>
      </div>
    </section>

    <!-- 보상  -->
    <section class="event-page__container" v-if="eventState.data">
      <div class="event-page__section-head" data-reveal>
        <h2 class="event-page__h2">🎁 당첨 선물 🎁</h2>
        <p class="event-page__muted">아래 혜택 중 일부가 랜덤으로 제공됩니다.</p>
      </div>

      <div class="event-page__grid">
        <article
          v-for="r in eventState.data.rewards"
          :key="r.id"
          class="event-page__reward"
          tabindex="0"
          data-reveal
        >
          <div class="event-page__reward-media">
            <img v-if="r.image" :src="`/rewards/${r.image}`" :alt="r.name" @error="onImgErr" />
            <div v-else class="event-page__fallback">{{ r.name[0] }}</div>
          </div>
          <div class="event-page__reward-name">{{ r.name }}</div>
        </article>
      </div>
    </section>

    <!-- 응모  -->
    <section class="event-page__container" data-container ref="formRef">
      <div class="event-page__section-head">
        <h2 class="event-page__h2">📝 응모하기 📝</h2>
        <p class="event-page__muted">아래 정보를 입력하고 이벤트에 참여하세요.</p>
      </div>

      <form class="event-page__form" @submit.prevent="submit">
        <div class="event-page__field" data-reveal>
          <label class="event-page__label">
            이름 <span class="event-page__required">*</span>
          </label>
          <input
            class="event-page__input"
            v-model.trim="form.name"
            placeholder="홍길동"
            :class="{ 'event-page__invalid': !!errors.name }"
          />
          <p class="event-page__err" v-if="errors.name">{{ errors.name }}</p>
        </div>

        <div class="event-page__field" data-reveal>
          <label class="event-page__label">
            연락처 <span class="event-page__required">*</span>
          </label>
          <input
            class="event-page__input"
            v-model.trim="form.phone"
            placeholder="010-1234-5678"
            inputmode="numeric"
            :class="{ 'event-page__invalid': !!errors.phone }"
          />
          <p class="event-page__err" v-if="errors.phone">{{ errors.phone }}</p>
        </div>

        <div class="event-page__field" data-reveal>
          <label class="event-page__label">
            이메일 <span class="event-page__required">*</span>
          </label>
          <input
            class="event-page__input"
            v-model.trim="form.email"
            placeholder="test@example.com"
            :class="{ 'event-page__invalid': !!errors.email }"
          />
          <p class="event-page__err" v-if="errors.email">{{ errors.email }}</p>
        </div>

        <div class="event-page__field event-page__row" data-reveal>
          <label class="event-page__check">
            <input type="checkbox" v-model="form.agreedTerms" />
            <span>약관에 동의합니다.</span>
          </label>
          <p class="event-page__err" v-if="errors.agreedTerms">{{ errors.agreedTerms }}</p>
        </div>

        <div class="event-page__actions" data-reveal>
          <button
            class="event-page__primary"
            :class="{ 'event-page__pressed': pressBtn }"
            type="submit"
            :disabled="submitState.loading || countdown.ended || isDuplicated"
            @click="buttonFeedback"
          >
            {{
              submitState.loading
                ? "제출 중..."
                : isDuplicated
                  ? "이미 응모 완료"
                  : countdown.ended
                    ? "이벤트 종료"
                    : "응모 제출"
            }}
          </button>

          <button
            class="event-page__ghost"
            type="button"
            @click="reset"
            :disabled="submitState.loading"
          >
            초기화
          </button>
        </div>

        <div v-if="submitState.success" class="event-page__feedback event-page__ok">
          ✅ 응모가 완료되었습니다! (룰렛 참여 가능)
        </div>
        <div v-if="submitState.error" class="event-page__feedback event-page__bad">
          ❌ 제출 실패: {{ submitState.error }}
        </div>
      </form>
    </section>

    <!-- 룰렛  -->
    <section class="event-page__container">
      <div class="event-page__section-head">
        <h2 class="event-page__h2">🔮 룰렛 돌리기 🔮</h2>
        <p class="event-page__muted">응모 후 참여 가능합니다.</p>
      </div>
      <Roulette
        :disabled="!submitState.success || hasSpun"
        :rewards="eventState.data?.rewards ?? []"
        :alreadyDone="submitState.success && hasSpun"
        @result="onRouletteResult"
      />
    </section>

    <footer class="event-page__footer">
      <span>© GroveSoft</span>
    </footer>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue";
  import type { EventResponse } from "../types/event";
  import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
  import { getCountdownParts } from "../utils/countdown";
  import type { EntryPayload } from "../types/entries";
  import { fetchEvent, submitEntry } from "../api/api";
  import Roulette from "../components/Roulette.vue";
  import { watch, nextTick } from "vue";

  /** --- event state --- */
  const eventState = reactive<{
    loading: boolean;
    error: string | null;
    data: EventResponse | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const { observeAll } = useRevealOnScroll();

  watch(
    () => eventState.data,
    async (v) => {
      if (!v) return;
      await nextTick();
      observeAll();
    }
  );

  /** --- 이벤트 카운트다운 --- */
  const countdown = reactive({ diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
  let timer: number | null = null;

  function tick() {
    if (!eventState.data) return;
    const parts = getCountdownParts(eventState.data.endDate);
    Object.assign(countdown, parts);
  }

  const countdownText = computed(() => {
    if (!eventState.data) return "--";

    if (countdown.ended) return "종료되었습니다";

    // 전체 남은 시간을 "총 시간"으로 환산 (days 포함)
    const totalHours = countdown.days * 24 + countdown.hours;

    const m = String(countdown.minutes).padStart(2, "0");
    const s = String(countdown.seconds).padStart(2, "0");

    return `${totalHours}시간 ${m}분 ${s}초 후 종료!`;
  });

  /** --- 스크롤 --- */
  const parallaxY = ref(0);

  function onScroll() {
    const y = window.scrollY || 0;
    parallaxY.value = y * 0.15;
  }

  /** ---토스트 --- */
  const toast = ref<string | null>(null);
  function showToast(msg: string) {
    toast.value = msg;
    setTimeout(() => (toast.value = null), 1800);
  }

  /** --- 버튼 함수 --- */
  const pressBtn = ref(false);
  function buttonFeedback() {
    pressBtn.value = true;
    setTimeout(() => (pressBtn.value = false), 140);
  }

  /** --- 날짜 text --- */
  const periodText = computed(() => {
    if (!eventState.data) return "-";

    const end = new Date(eventState.data.endDate);

    const y = end.getFullYear();
    const m = String(end.getMonth() + 1).padStart(2, "0");
    const d = String(end.getDate()).padStart(2, "0");

    const hh = String(end.getHours()).padStart(2, "0");
    const mm = String(end.getMinutes()).padStart(2, "0");

    return `${y}년 ${m}월 ${d}일 ${hh}시 ${mm}분`;
  });

  /** --- 응모 완료 키 --- */
  const ENTRY_KEY = "promo_event_entry_done_v1";
  const isDuplicated = ref(false);
  function syncDuplicated() {
    isDuplicated.value = localStorage.getItem(ENTRY_KEY) === "1";
  }
  /** --- 룰렛 1회 완료 키 --- */
  const ROULETTE_KEY = "promo_event_roulette_done_v1";
  const hasSpun = ref(false);

  function syncHasSpun() {
    hasSpun.value = localStorage.getItem(ROULETTE_KEY) === "1";
  }

  function onRouletteResult() {
    localStorage.setItem(ROULETTE_KEY, "1");
    syncHasSpun();
    showToast("룰렛 참여 완료!");
  }

  /** --- 폼 관련 정보 --- */
  const form = reactive<EntryPayload>({
    name: "",
    phone: "",
    email: "",
    agreedTerms: false,
  });

  const errors = reactive<Record<keyof EntryPayload, string | null>>({
    name: null,
    phone: null,
    email: null,
    agreedTerms: null,
  });

  function validate(): boolean {
    errors.name = form.name ? null : "이름은 필수입니다.";
    const phoneOk = /^01[0-9]-?\d{3,4}-?\d{4}$/.test(form.phone);
    errors.phone = form.phone && phoneOk ? null : "연락처 형식을 확인해주세요. (예: 010-1234-5678)";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
    errors.email = form.email && emailOk ? null : "이메일 형식을 확인해주세요.";
    errors.agreedTerms = form.agreedTerms ? null : "약관 동의는 필수입니다.";

    return !errors.name && !errors.phone && !errors.email && !errors.agreedTerms;
  }

  const submitState = reactive<{ loading: boolean; success: boolean; error: string | null }>({
    loading: false,
    success: false,
    error: null,
  });

  /** --- 폼 제출 --- */
  async function submit() {
    submitState.error = null;

    if (countdown.ended) {
      submitState.error = "이벤트가 종료되었습니다.";
      return;
    }
    if (isDuplicated.value) {
      submitState.error = "이미 응모 완료되었습니다.";
      return;
    }
    if (!validate()) return;

    submitState.loading = true;
    try {
      await submitEntry({ ...form });
      submitState.success = true;
      localStorage.setItem(ENTRY_KEY, "1");
      syncDuplicated();
      showToast("응모 완료!");
    } catch (e: any) {
      submitState.error = e?.message ?? "알 수 없는 오류";
      submitState.success = false;
    } finally {
      submitState.loading = false;
    }
  }

  function reset() {
    form.name = "";
    form.phone = "";
    form.email = "";
    form.agreedTerms = false;
    submitState.success = false;
    submitState.error = null;
    (Object.keys(errors) as (keyof EntryPayload)[]).forEach((k) => (errors[k] = null));
  }

  function onImgErr(ev: Event) {
    const img = ev.target as HTMLImageElement;
    img.style.display = "none";
  }

  async function loadEvent() {
    eventState.loading = true;
    eventState.error = null;
    try {
      const data = await fetchEvent();
      eventState.data = data;
      tick();
      if (timer) window.clearInterval(timer);
      timer = window.setInterval(tick, 1000);
    } catch (e: any) {
      eventState.error = e?.message ?? "네트워크 오류";
      eventState.data = null;
    } finally {
      eventState.loading = false;
    }
  }

  onMounted(() => {
    syncDuplicated();
    syncHasSpun();
    loadEvent();
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
    window.removeEventListener("scroll", onScroll);
  });
</script>

<style lang="scss">
  .event-page {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    overflow-x: hidden;

    &__hero {
      max-width: 600px;
      margin: 0 auto;
      padding: 56px 18px 26px;
      overflow: hidden;
    }

    &__badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: -0.2px;
      color: #fff;
      background: linear-gradient(90deg, rgba(92, 225, 245, 0.95), rgba(190, 132, 245, 0.95));
    }

    &__title {
      margin: 10px 0 8px;
      font-size: 34px;
      letter-spacing: -0.5px;
    }

    &__desc {
      margin: 0 0 18px;
      opacity: 0.9;
    }

    &__hero-meta {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin-top: 12px;
    }

    &__meta-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    &__meta-label {
      opacity: 0.75;
    }

    &__meta-value {
      font-weight: 700;
    }

    &__ended {
      opacity: 0.6;
    }

    /* ================= buttons  ================= */
    &__primary,
    &__ghost {
      appearance: none;
      border: 0;
      cursor: pointer;
      padding: 12px 18px;
      border-radius: 14px;
      font-weight: 700;
      letter-spacing: -0.2px;
      transition:
        transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
        box-shadow 0.18s ease,
        filter 0.18s ease,
        background 0.18s ease,
        opacity 0.18s ease;
      will-change: transform;
    }

    &__primary {
      color: #0f172a;
      background: linear-gradient(135deg, #7dd3fc 0%, #a5b4fc 100%);
    }

    &__primary:hover {
      filter: brightness(1.06);
      transform: translateY(-1px);
    }

    &__primary:active {
      transform: translateY(0) scale(0.97);
    }

    &__primary:disabled {
      background: linear-gradient(135deg, #e5e7eb, #f1f5f9);
      color: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
    }

    &__ghost {
      color: #334155;
      background: rgba(255, 255, 255, 0.55);
      backdrop-filter: blur(6px);
      border: 1px solid rgba(148, 163, 184, 0.25);
    }

    &__ghost:hover {
      background: rgba(255, 255, 255, 0.75);
      transform: translateY(-1px);
    }

    &__ghost:active {
      transform: scale(0.97);
    }

    &__pressed {
      animation: click 0.14s ease;
    }

    @keyframes click {
      from {
        transform: scale(1);
      }
      to {
        transform: scale(0.965);
      }
    }

    /* ================= container ================= */
    &__container {
      max-width: 600px;
      margin: 0 auto;
      padding: 50px 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    &__section-head {
      width: 100%;
      margin-bottom: 12px;
    }

    &__h2 {
      margin: 0;
      font-size: 20px;
    }

    &__muted {
      margin: 6px 0 0;
      opacity: 0.8;
    }

    /* ================= status ================= */
    &__status {
      padding: 14px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    &__status--error {
      border-color: rgba(248, 113, 113, 0.4);
    }

    &__link {
      margin-left: 10px;
      background: transparent;
      border: 0;
      text-decoration: underline;
      cursor: pointer;
      opacity: 0.9;
    }

    /* ================= rewards ================= */
    &__grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    &__reward {
      padding: 14px;
      border-radius: 18px;
      background: #fff;
      border: 1px solid rgba(255, 255, 255, 0.12);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;
    }

    &__reward:hover,
    &__reward:focus {
      transform: translateY(-2px) scale(1.02);
      box-shadow:
        0 0 0 1px rgba(34, 211, 238, 0.22),
        0 10px 30px rgba(0, 0, 0, 0.28);
      border-color: rgba(34, 211, 238, 0.28);
    }

    &__reward-media {
      width: 100%;
      aspect-ratio: 4 / 3;
      max-height: 220px;
      border-radius: 16px;
      background: rgba(211, 211, 211, 0.18);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &__reward-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &__fallback {
      font-size: 26px;
      opacity: 0.85;
    }

    &__reward-name {
      margin-top: 10px;
      font-weight: 700;
    }

    /* ================= form ================= */
    &__form {
      width: 100%;
      padding: 16px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }

    &__field {
      min-width: 350px;
      display: grid;
      gap: 6px;
      margin-bottom: 12px;
    }

    &__label {
      font-size: 13px;
      margin-left: 5px;
      opacity: 0.85;
    }

    &__required {
      color: red;
    }

    &__input {
      padding: 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(0, 0, 0, 0.05);
      outline: none;
    }

    &__input::placeholder {
      color: rgba(56, 56, 56, 0.45);
    }

    &__input:focus {
      border-color: rgba(34, 211, 238, 0.35);
    }

    &__invalid {
      border-color: rgba(248, 113, 113, 0.55) !important;
    }

    &__err {
      font-size: 12px;
      color: rgba(248, 113, 113, 0.92);
    }

    &__row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }

    &__check {
      display: flex;
      gap: 8px;
      cursor: pointer;
    }

    &__actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      flex-wrap: wrap;
    }

    &__feedback {
      margin-top: 30px;
      padding: 12px 14px;
      border-radius: 14px;
    }

    &__ok {
      border: 1px solid rgba(34, 211, 238, 0.35);
      background: rgba(34, 211, 238, 0.1);
    }

    &__bad {
      border: 1px solid rgba(248, 113, 113, 0.35);
      background: rgba(248, 113, 113, 0.1);
    }

    /* ================= reveal ================= */
    [data-reveal] {
      opacity: 0 !important;
      transform: translateY(40px) !important;
      transition:
        opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94),
        transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    [data-reveal].is-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }

    &__form &__field[data-reveal] {
      transition-delay: 0ms;
    }
    &__form &__field[data-reveal]:nth-of-type(1) {
      transition-delay: 0.05s;
    }
    &__form &__field[data-reveal]:nth-of-type(2) {
      transition-delay: 0.12s;
    }
    &__form &__field[data-reveal]:nth-of-type(3) {
      transition-delay: 0.19s;
    }
    &__form &__field[data-reveal]:nth-of-type(4) {
      transition-delay: 0.26s;
    }
    &__form &__actions[data-reveal] {
      transition-delay: 0.33s;
    }

    /* ================= footer ================= */
    &__footer {
      padding: 22px 18px 40px;
      opacity: 0.65;
      text-align: center;
      font-size: 12px;
    }

    /* ================= responsive ================= */
    @media (max-width: 760px) {
      &__title {
        font-size: 28px;
      }

      &__grid {
        grid-template-columns: repeat(2, 1fr);
      }

      &__meta-item {
        flex-direction: column;
        align-items: flex-start;
      }
    }
    /* ================= spinner ================= */
    &__overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }

    &__spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    &__spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #7dd3fc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    &__loading-text {
      font-weight: 500;
      color: #334155;
      letter-spacing: -0.5px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .fade-enter-active,
    .fade-leave-active {
      transition: opacity 0.3s ease;
    }
    .fade-enter-from,
    .fade-leave-to {
      opacity: 0;
    }
  }
</style>
