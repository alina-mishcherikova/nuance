'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { Button } from './button';
export function AboutDialog() {
  const t = useTranslations();
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="quiet">{t('privacyLink')}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{t('privacyTitle')}</Dialog.Title>
          <Dialog.Description>{t('privacyBody')}</Dialog.Description>
          <Dialog.Close asChild>
            <Button variant="outline">{t('close')}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
