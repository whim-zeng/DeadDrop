"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import FloatingNotes from "../components/FloatingNotes";

export default function HomePage() {
  const router = useRouter();

  return (
    <section className="home-page">
      <FloatingNotes />
      <motion.div
        className="home-page__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1, ease: "easeOut" }}
      >
        <p className="home-page__line">在你所在的地方，放下一张纸条。</p>
        <button className="home-page__button" type="button" onClick={() => router.push("/drop")}>
          放下
        </button>
        <p className="home-page__hint">你的纸条只有身边的人能看到</p>
      </motion.div>
      <style>{`
        .home-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 50%, #16213E 100%);
        }

        .home-page__content {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          text-align: center;
        }

        .home-page__line {
          margin: 0 0 48px;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 20px;
          font-weight: 400;
          letter-spacing: 0.04em;
          opacity: 0.9;
          text-shadow: 0 0 18px rgba(245, 240, 232, 0.18);
        }

        .home-page__button {
          border: 1px solid rgba(245, 240, 232, 0.3);
          border-radius: 4px;
          padding: 16px 48px;
          background: transparent;
          color: #F5F0E8;
          font-family: "Noto Serif SC", "Noto Serif", serif;
          font-size: 16px;
          line-height: 1;
          letter-spacing: 0.14em;
          transition: border-color 300ms ease-out, background-color 300ms ease-out;
        }

        .home-page__button:hover {
          border-color: rgba(245, 240, 232, 0.6);
          background: rgba(245, 240, 232, 0.03);
        }

        .home-page__hint {
          margin: 24px 0 0;
          color: #F5F0E8;
          font-family: "Noto Sans SC", "Noto Sans", sans-serif;
          font-size: 12px;
          letter-spacing: 0.08em;
          opacity: 0.3;
        }
      `}</style>
    </section>
  );
}
