import React from "react";

type Props = {
  startedAt?: string | null;
  nextDateLabel?: string | null;
  nextDate?: string | null;
  wishesCount?: number;
};

export default function TogetherSummary({ startedAt, nextDateLabel, nextDate, wishesCount = 0 }: Props) {
  const days = startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000))
    : null;

  const until = nextDate
    ? Math.max(0, Math.ceil((new Date(nextDate).getTime() - new Date().getTime()) / 86400000))
    : null;

  return (
    <div className="us-together-grid">
      <div className="us-together-card">
        <div className="us-together-label">Вместе</div>
        <div className="us-together-value">{days === null ? "Дата не указана" : `${days} ${days === 1 ? "день" : "дней"}`}</div>
        <div className="us-together-sub">ваша история</div>
      </div>
      <div className="us-together-card">
        <div className="us-together-label">{nextDateLabel || "Ближайшая дата"}</div>
        <div className="us-together-value">{until === null ? "Пока нет" : until === 0 ? "Сегодня ❤️" : `Через ${until} дн.`}</div>
        <div className="us-together-sub">{nextDate ? new Date(nextDate).toLocaleDateString("ru-RU") : "Добавьте важную дату"}</div>
      </div>
      <div className="us-together-card">
        <div className="us-together-label">Желания</div>
        <div className="us-together-value">{wishesCount}</div>
        <div className="us-together-sub">идей для вас двоих</div>
      </div>
      <div className="us-together-card">
        <div className="us-together-label">Ваше пространство</div>
        <div className="us-together-value">Только вы двое</div>
        <div className="us-together-sub">личное пространство пары</div>
      </div>
    </div>
  );
}
