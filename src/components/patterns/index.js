/**
 * Platform pattern library — import everything from here:
 *   import { StatusChip, WorkbenchTable, DetailPage, … } from '@/components/patterns'
 *
 * See README.md in this folder for the rules each pattern encodes.
 */
export { default as StatusChip } from './StatusChip.jsx';
export { statusTone, CHIP_TONES } from './statusTokens.js';
export { default as Avatar } from './Avatar.jsx';
export { getInitials } from './avatarUtils.js';
export { default as ImageUploadField } from './ImageUploadField.jsx';
export { default as EmptyState } from './EmptyState.jsx';
export { Shimmer, TableSkeleton, DetailSkeleton, DashboardSkeleton, CardGridSkeleton, FinanceTableSkeleton } from './Skeletons.jsx';
export { default as Timeline } from './Timeline.jsx';
export { default as ConfirmDestructiveDialog } from './ConfirmDestructiveDialog.jsx';
export { default as ToastHost } from './ToastHost.jsx';
export { pushToast } from './toastBus.js';
export { Field, FormSection, Drawer } from './FormKit.jsx';
export { inputClass, useFieldErrors, useFormDraft } from './formHelpers.js';
export { default as useKeyboardGrid, gridCellClass } from './KeyboardGrid.jsx';
export { default as Wizard } from './Wizard.jsx';
export { default as WorkbenchTable } from './WorkbenchTable.jsx';
export { default as DetailPage } from './DetailPage.jsx';
export { default as ApprovalInbox } from './ApprovalInbox.jsx';
export { default as HelpCards } from './HelpCards.jsx';
