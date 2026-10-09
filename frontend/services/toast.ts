import hotToast from "react-hot-toast";

const position = { position: "top-right" as const };

const toast = {
  success(message: string) {
    return hotToast.success(message, position);
  },
  warning(message: string) {
    return hotToast(message, { ...position, icon: "⚠️" });
  },
};

export default toast;
