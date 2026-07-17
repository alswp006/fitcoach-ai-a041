import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

export type TabItem = {
  label: string;
  icon?: ReactNode;
  path: string;
};

export function FloatingTabBarCopy({ items }: { items: TabItem[] }) {
  const navigate = useNavigate();
  const location = useLocation();
  console.log("COPY_TABBAR pathname=", location.pathname);

  return (
    <nav role="tablist" aria-label="메인 네비게이션">
      {items.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={item.label}
            onClick={() => {
              try {
                Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
              } catch {
                /* ignore */
              }
              navigate(item.path);
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
