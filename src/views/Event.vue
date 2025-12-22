<template>
  <main class="page" @scroll.passive="onScroll">
    <header class="hero">
      <div
        class="heroBg"
        :style="{ transform: `translateY(${parallaxY}px)` }"
        aria-hidden="true"
      ></div>
      <div class="heroInner" data-reveal>
        <p class="badge">신규 서비스 오픈 기념</p>
        <h1 class="h1">{{ eventState.data?.title ?? "이벤트 로딩 중..." }}</h1>
        <p class="desc">{{ eventState.data?.description ?? "" }}</p>

        <div class="heroMeta">
          <div class="metaItem">
            <span class="metaLabel">기간</span>
            <span class="metaValue">{{ periodText }}</span>
          </div>
          <div class="metaItem">
            <span class="metaLabel">남은 시간</span>
            <span class="metaValue" :class="{ ended: countdown.ended }">
              <template v-if="eventState.data">
                {{ countdown.days }}d {{ pad2(countdown.hours) }}:{{ pad2(countdown.minutes) }}:{{
                  pad2(countdown.seconds)
                }}
                <span v-if="countdown.ended"> (종료)</span>
              </template>
              <template v-else>--</template>
            </span>
          </div>
        </div>

        <div class="heroActions">
          <button class="primary" :class="{ pressed: pressBtn }" @click="scrollToForm">
            지금 응모하기
          </button>
          <button class="ghost" @click="copyShareUrl">공유하기</button>
          <span class="toast" v-if="toast">{{ toast }}</span>
        </div>
      </div>
    </header>

    <!-- 상태 UI -->
    <section class="container" data-reveal>
      <div v-if="eventState.loading" class="status">이벤트 정보를 불러오는 중...</div>
      <div v-else-if="eventState.error" class="status status--error">
        불러오기 실패: {{ eventState.error }}
        <button class="link" @click="loadEvent">다시 시도</button>
      </div>
    </section>

    <!-- Rewards -->
    <section class="container" data-reveal v-if="eventState.data">
      <div class="sectionHead">
        <h2 class="h2">🎁 혜택</h2>
        <p class="muted">아래 혜택 중 일부가 랜덤으로 제공됩니다.</p>
      </div>

      <div class="grid">
        <article v-for="r in eventState.data.rewards" :key="r.id" class="reward" tabindex="0">
          <div class="rewardMedia">
            <img v-if="r.image" :src="r.image" :alt="r.name" @error="onImgErr" />
            <div v-else class="fallback">{{ r.name[0] }}</div>
          </div>
          <div class="rewardName">{{ r.name }}</div>
        </article>
      </div>
    </section>

    <!-- Entry Form -->
    <section class="container" data-reveal ref="formRef">
      <div class="sectionHead">
        <h2 class="h2">📝 응모하기</h2>
        <p class="muted">아래 정보를 입력하고 이벤트에 참여하세요.</p>
      </div>

      <form class="form" @submit.prevent="submit">
        <div class="field">
          <label>이름 <span class="required">*</span></label>
          <input
            v-model.trim="form.name"
            placeholder="홍길동"
            :class="{ invalid: !!errors.name }"
          />
          <p class="err" v-if="errors.name">{{ errors.name }}</p>
        </div>

        <div class="field">
          <label>연락처 <span class="required">*</span></label>
          <input
            v-model.trim="form.phone"
            placeholder="010-1234-5678"
            inputmode="numeric"
            :class="{ invalid: !!errors.phone }"
          />
          <p class="err" v-if="errors.phone">{{ errors.phone }}</p>
        </div>

        <div class="field">
          <label>이메일 <span class="required">*</span></label>
          <input
            v-model.trim="form.email"
            placeholder="test@example.com"
            :class="{ invalid: !!errors.email }"
          />
          <p class="err" v-if="errors.email">{{ errors.email }}</p>
        </div>

        <div class="field row">
          <label class="check">
            <input type="checkbox" v-model="form.agreedTerms" />
            <span>약관에 동의합니다. *</span>
          </label>
          <p class="err" v-if="errors.agreedTerms">{{ errors.agreedTerms }}</p>
        </div>

        <div class="actions">
          <button
            class="primary"
            :class="{ pressed: pressBtn }"
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

          <button class="ghost" type="button" @click="reset" :disabled="submitState.loading">
            초기화
          </button>
        </div>

        <div v-if="submitState.success" class="feedback ok">
          ✅ 응모가 완료되었습니다! (룰렛 참여 가능)
        </div>
        <div v-if="submitState.error" class="feedback bad">
          ❌ 제출 실패: {{ submitState.error }}
        </div>
      </form>
    </section>

    <!-- Mini Interaction -->
    <section class="container">
      <Roulette :disabled="submitState.success" :rewards="eventState.data?.rewards ?? []" />
    </section>

    <footer class="footer">
      <span>© GroveSoft</span>
    </footer>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, onBeforeUnmount, reactive, ref } from "vue";
  import type { EventResponse } from "../types/event";
  import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
  import { getCountdownParts, pad2 } from "../utils/countdown";
  import type { EntryPayload } from "../types/entries";
  import { fetchEvent, submitEntry } from "../api/api";
  import Roulette from "../components/Roulette.vue";

  useRevealOnScroll();

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

  /** --- countdown --- */
  const countdown = reactive({ diff: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ended: false });
  let timer: number | null = null;

  function tick() {
    if (!eventState.data) return;
    const parts = getCountdownParts(eventState.data.endDate);
    Object.assign(countdown, parts);
  }

  /** --- parallax --- */
  const parallaxY = ref(0);
  function onScroll() {
    // main에 스크롤이 걸려있지 않을 수도 있어 window 스크롤 기반 보정
    const y = window.scrollY || 0;
    parallaxY.value = Math.min(60, y * 0.12);
  }

  /** --- share toast --- */
  const toast = ref<string | null>(null);
  function showToast(msg: string) {
    toast.value = msg;
    setTimeout(() => (toast.value = null), 1800);
  }
  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(location.href);
      showToast("URL이 복사되었습니다");
    } catch {
      showToast("복사에 실패했어요");
    }
  }

  /** --- button feedback --- */
  const pressBtn = ref(false);
  function buttonFeedback() {
    pressBtn.value = true;
    setTimeout(() => (pressBtn.value = false), 140);
  }

  /** --- period text --- */
  const periodText = computed(() => {
    if (!eventState.data) return "-";
    const end = new Date(eventState.data.endDate);
    return `~ ${end.toLocaleString("ko-KR")}`;
  });

  /** --- duplicate prevention --- */
  const ENTRY_KEY = "promo_event_entry_done_v1";
  const isDuplicated = ref(false);
  function syncDuplicated() {
    isDuplicated.value = localStorage.getItem(ENTRY_KEY) === "1";
  }

  /** --- form --- */
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

  const formRef = ref<HTMLElement | null>(null);
  function scrollToForm() {
    buttonFeedback();
    formRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    loadEvent();
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer);
    window.removeEventListener("scroll", onScroll);
  });
</script>

<style>
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
  }
  .page {
    min-height: 100vh;
  }

  .hero {
    position: relative;
    padding: 56px 18px 26px;
    overflow: hidden;
  }
  .heroBg {
    position: absolute;
    inset: -40px -40px auto -40px;
    height: 320px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    filter: blur(0px);
    will-change: transform;
  }
  .heroInner {
    max-width: 980px;
    margin: 0 auto;
    position: relative;
  }
  .badge {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 12px;
  }
  .h1 {
    margin: 10px 0 8px;
    font-size: 34px;
    letter-spacing: -0.5px;
  }
  .desc {
    margin: 0 0 18px;
    opacity: 0.9;
  }

  .heroMeta {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 12px;
  }
  .metaItem {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .metaLabel {
    opacity: 0.75;
  }
  .metaValue {
    font-weight: 700;
  }
  .ended {
    opacity: 0.6;
  }

  .heroActions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 16px;
  }
  .primary,
  .ghost {
    appearance: none;
    border: 0;
    cursor: pointer;
    padding: 10px 14px;
    border-radius: 12px;
    color: black;
    transition:
      transform 0.12s ease,
      filter 0.12s ease,
      opacity 0.12s ease;
  }
  .primary {
    background: linear-gradient(90deg, rgba(34, 211, 238, 0.35), rgba(168, 85, 247, 0.35));
    border: 1px solid rgba(255, 255, 255, 0.18);
  }

  .ghost {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .primary:hover,
  .ghost:hover {
    filter: brightness(1.08);
  }
  .primary:active,
  .ghost:active {
    transform: scale(0.98);
  }
  .pressed {
    animation: click 0.14s ease;
  }
  @keyframes click {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(0.985);
    }
  }

  .toast {
    font-size: 12px;
    opacity: 0.9;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
  }

  .container {
    max-width: 980px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px 18px;
  }

  .sectionHead {
    margin-bottom: 12px;
  }
  .h2 {
    margin: 0;
    font-size: 20px;
  }
  .muted {
    margin: 6px 0 0;
    opacity: 0.8;
  }

  .status {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .status--error {
    border-color: rgba(248, 113, 113, 0.4);
  }
  .link {
    margin-left: 10px;
    background: transparent;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
    opacity: 0.9;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
  .reward {
    padding: 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.18s ease;
    outline: none;
  }
  .reward:hover,
  .reward:focus {
    transform: translateY(-2px) scale(1.02);
    box-shadow:
      0 0 0 1px rgba(34, 211, 238, 0.22),
      0 10px 30px rgba(0, 0, 0, 0.28);
    border-color: rgba(34, 211, 238, 0.28);
  }
  .rewardMedia {
    height: 84px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: grid;
    place-items: center;
    overflow: hidden;
  }
  .rewardMedia img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .fallback {
    font-size: 26px;
    opacity: 0.85;
  }
  .rewardName {
    margin-top: 10px;
    font-weight: 700;
  }

  .form {
    padding: 16px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .field {
    min-width: 350px;
    display: grid;
    gap: 6px;
    margin-bottom: 12px;
  }
  .required {
    color: red;
  }
  .field label {
    font-size: 13px;
    text-align: left;
    margin-left: 5px;
    opacity: 0.85;
  }
  .field input {
    padding: 12px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(0, 0, 0, 0.1);
    outline: none;
  }
  .field input:focus {
    border-color: rgba(34, 211, 238, 0.35);
  }
  .invalid {
    border-color: rgba(248, 113, 113, 0.55) !important;
  }
  .err {
    margin: 0;
    font-size: 12px;
    color: rgba(248, 113, 113, 0.92);
  }

  .row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .check {
    display: flex;
    gap: 8px;
    align-items: center;
    cursor: pointer;
  }
  .actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 6px;
  }
  .primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .feedback {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid transparent;
  }
  .ok {
    border-color: rgba(34, 211, 238, 0.35);
    background: rgba(34, 211, 238, 0.1);
  }
  .bad {
    border-color: rgba(248, 113, 113, 0.35);
    background: rgba(248, 113, 113, 0.1);
  }

  .footer {
    padding: 22px 18px 40px;
    opacity: 0.65;
    text-align: center;
    font-size: 12px;
  }

  /* reveal animation */
  [data-reveal] {
    opacity: 1;
    transform: translateY(14px);
    transition:
      opacity 650ms ease,
      transform 650ms ease;
  }
  .is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* responsive */
  @media (max-width: 760px) {
    .h1 {
      font-size: 28px;
    }
    .grid {
      grid-template-columns: 1fr;
    }
    .metaItem {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
