## 1. 실행 방법

```bash
npm install //최초 1회만 실행
npm run dev
```

## 2. 사용한 라이브러리 및 사용 이유, 컴포넌트, 훅

### SCSS

- .event-page\_\_... 형태로 BEM 구조를 쓰고 있어서 중첩/변수/구조화
  섹션별 스타일을 한 파일에서 계층적으로 관리 가능

### hook - useRevealOnScroll 훅

스크롤 위치에 따라 요소가 자연스럽게 등장하도록 하기 위해 IntersectionObserver 기반의 커스텀 훅을 구현했습니다.

### Roulette 컴포넌트

이벤트 응모 완료 후 1회 참여 가능한 룰렛 UI를 제공하는 컴포넌트입니다.
SVG로 룰렛 휠을 렌더링하고, CSS 회전 애니메이션을 통해 스핀 효과를 구현했습니다.
rewards.length에 따라 segmentAngle = 360 / N으로 자동 분할하고, 각 조각을 path(arc)로 그려 보상 개수가 바뀌어도 동일한 로직으로 확장되도록 구현했습니다. 회전이 끝난 뒤 totalRotation % 360으로 실제 각도를 구하고,
상단 화살표가 가리키는 구간을 기준으로 인덱스를 계산했습니다. isSpinning으로 스핀 중 재클릭을 차단하고, disabled 상태에서는 pointer-events까지 막아
UX와 상태 안정성을 함께 확보했습니다.

```
Props

rewards: Reward[] : 룰렛에 표시될 보상 목록
disabled: boolean : 응모 전/종료 등 참여 불가 상태 제어
alreadyDone: boolean : (확장용) 이미 룰렛 완료 상태 표시 목적
```

## 3. 구현 시 고민한 점

1. 상태 분리(로딩/에러/성공)로 UI 안정성 확보

   eventState.loading / error / data를 분리해 데이터 로딩 전후에도 화면이 깨지지 않도록 했고, 로딩 오버레이/에러 재시도 UI를 별도로 제공했습니다.

2. 카운트다운 정확도 + 리소스 정리

   endDate 기반으로 1초마다 카운트다운을 갱신하며, 컴포넌트 언마운트 시 clearInterval을 수행해 타이머 누수를 방지했습니다. 또한 days를 포함한 “총 시간” 표기로 사용자가 남은 시간을 직관적으로 이해하도록 했습니다.

3. 중복 응모/룰렛 1회 제한

   localStorage에 응모 완료 키(ENTRY_KEY)와 룰렛 완료 키(ROULETTE_KEY)를 분리 저장해
   “응모 1회 → 룰렛 참여 가능 → 룰렛 1회 참여 제한” 흐름이 명확하게 동작하도록 했습니다.
   버튼 disabled 조건(제출 중/종료/중복)을 조합해 중복 요청을 프론트에서 최대한 차단했습니다.

4. 폼 검증(Validation)과 사용자 피드백

   연락처/이메일은 정규식을 사용해 제출 전에 검증하고, 필드별 에러 메시지를 즉시 노출했습니다.
   제출 성공/실패에 대해 상태 메시지 및 토스트로 피드백을 제공했습니다.

## 4. 배포 링크

[Vercel](https://grovesoft-assignment.vercel.app/#/event)

## 5. 선택 구현 사항

- 중복 응모 방지 (LocalStorage 활용) - ✅
- 응모 완료 후 **공유하기** 기능 (URL 복사) - ✅
- **반응형** 디자인 (모바일 대응) - ✅
- **Lottie** 또는 **GSAP** 활용한 고급 애니메이션 - ✅ Lottie
- TypeScript 사용 - ✅
