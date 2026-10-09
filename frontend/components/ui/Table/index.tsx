import React, { TableHTMLAttributes } from 'react';

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

export function Table({ className, children, ...props }: TableProps) {
  return (
    <table className={className} {...props}>
      {children}
    </table>
  );
}
