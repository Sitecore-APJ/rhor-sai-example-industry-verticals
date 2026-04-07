import React, { JSX } from 'react';
import { ComponentProps } from '@/lib/component-props';
import { Placeholder } from '@sitecore-content-sdk/nextjs';

export type HeaderProps = ComponentProps & {
  params: { [key: string]: string };
};

export const Default = (props: HeaderProps): JSX.Element => {
  const { styles, RenderingIdentifier: id, DynamicPlaceholderId } = props.params;

  return (
    <div
      className={`component header border-border/80 bg-background/95 supports-backdrop-filter:bg-background/90 border-b backdrop-blur-sm ${styles}`}
      id={id}
    >
      <div className="container flex items-center gap-3 py-1 lg:gap-5">
        <div className="max-lg:order-1 lg:flex-[1_1]">
          <Placeholder name={`header-left-${DynamicPlaceholderId}`} rendering={props.rendering} />
        </div>
        <div className="max-lg:order-0 max-lg:mr-auto max-lg:w-2/3 lg:flex-[4_1]">
          <Placeholder name={`header-nav-${DynamicPlaceholderId}`} rendering={props.rendering} />
        </div>
        <div className="max-lg:order-2 lg:flex-[1_1]">
          <Placeholder name={`header-right-${DynamicPlaceholderId}`} rendering={props.rendering} />
        </div>
      </div>
    </div>
  );
};
