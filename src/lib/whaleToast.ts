export const whaleToast = {
  success: (message: string) => {
    window.dispatchEvent(new CustomEvent("whale-notify", { detail: { message, type: "success" } }));
  },
  error: (message: string) => {
    window.dispatchEvent(new CustomEvent("whale-notify", { detail: { message, type: "error" } }));
  },
};
