/**
 * ZapTab UI Component Library
 * Categorized into design system primitives (ui), layout shells (layout),
 * user feedback/dialogs (feedback), and domain feature modules (features).
 */

// UI Primitives (Atoms)
export { default as Button } from "./ui/Button";
export type { ButtonProps } from "./ui/Button";
export { default as Card } from "./ui/Card";
export { default as InputField } from "./ui/InputField";
export { default as UserAvatar } from "./ui/UserAvatar";
export { default as ConfirmModal } from "./ui/ConfirmModal";
export type { ConfirmModalProps } from "./ui/ConfirmModal";
export { default as GradientGoldText } from "./ui/GradientGoldText";
export { default as ZapTabWordmark } from "./ui/ZapTabWordmark";
export { default as AnimatedEllipsis } from "./ui/AnimatedEllipsis";
export { default as ShimmerWelcomeText } from "./ui/ShimmerWelcomeText";
export { default as ActionChip } from "./ui/ActionChip";
export type { ActionChipProps } from "./ui/ActionChip";
export * from "./ui/OAuthIcons";

// Layout Shells & Structural Components
export { default as ScreenContainer } from "./layout/ScreenContainer";
export { default as MobileHeader } from "./layout/MobileHeader";
export { default as TabBar } from "./layout/TabBar";
export { default as GridBackground } from "./layout/GridBackground";

// Feedback, Modals & Error Boundary
export { default as EmptyState } from "./feedback/EmptyState";
export type { EmptyStateProps } from "./feedback/EmptyState";
export { default as SupportSheet } from "./feedback/SupportSheet";
export { ErrorBoundary } from "./feedback/ErrorBoundary";

// Domain Feature Modules (Molecules & Organisms)
export { default as ReceiptCard } from "./features/ReceiptCard";
export type { ReceiptCardProps } from "./features/ReceiptCard";
export { default as RoomCard } from "./features/RoomCard";
export type { RoomCardProps } from "./features/RoomCard";
export { default as BillImageModal } from "./features/BillImageModal";
export type { BillImageModalProps } from "./features/BillImageModal";
export { default as PaymentPanel } from "./features/PaymentPanel";
export { default as ItemSelectionList } from "./features/ItemSelectionList";
export { default as QRDisplay } from "./features/QRDisplay";
export { default as ScanSheet } from "./features/ScanSheet";
export { default as BillEditor } from "./features/BillEditor";
export * from "./features/editor";
export { default as AuthForm } from "./features/AuthForm";
export { default as AnimatedSplashScreen } from "./features/AnimatedSplashScreen";

