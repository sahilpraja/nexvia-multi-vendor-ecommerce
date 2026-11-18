import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../redux/store.js';
import { clearNotification } from '../../redux/slices/cartSlice.js';

export const CartNotificationToast: React.FC = () => {
  const dispatch = useAppDispatch();
  const notification = useAppSelector((state) => state.cart.notification);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dispatch(clearNotification());
    }, 4000);
    return () => clearTimeout(timer);
  }, [notification, dispatch]);

  if (!notification) return null;

  const isSuccess = notification.type === 'success';
  const isError = notification.type === 'error';

  return (
    <aside
      aria-label="Notification"
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-200"
    >
      <div
        className={`flex items-start space-x-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md ${
          isSuccess
            ? 'bg-emerald-950/90 text-white border-emerald-700/50'
            : isError
            ? 'bg-rose-950/90 text-white border-rose-700/50'
            : 'bg-gray-900/90 text-white border-gray-750'
        }`}
      >
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />}

        <div className="flex-1 text-xs font-semibold leading-relaxed">
          {notification.message}
        </div>

        <button
          type="button"
          onClick={() => dispatch(clearNotification())}
          className="text-gray-400 hover:text-white transition p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
