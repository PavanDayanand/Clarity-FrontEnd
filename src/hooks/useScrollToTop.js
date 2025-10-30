import { useEffect } from "react";

function useScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
}

export default useScrollToTop;
