import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import IdentityEvent, { type IdentityEventProps } from '@/components/identity-event/IdentityEvent';
import { CommonParams, CommonRendering } from './common/commonData';
import { createTextField } from './helpers/createFields';

const baseParams = {
  ...CommonParams,
};

const meta = {
  title: 'Forms/IdentityEvent',
  component: IdentityEvent,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<IdentityEventProps>;

export default meta;

type Story = StoryObj<IdentityEventProps>;

export const Default: Story = {
  render: () => (
    <IdentityEvent
      params={baseParams}
      rendering={{
        ...CommonRendering,
        componentName: 'IdentityEvent',
        params: baseParams,
      }}
      fields={{
        Title: createTextField('Identity event'),
        SubmitLabel: createTextField('Send identity event'),
      }}
    />
  ),
};
