import React from 'react';

import { IconProps } from '../Icon.interface';
import classNames from '../../utils/classNames';
import styles from '../Icon.module.css';

export const IconArrowRedo = ({ size = 's', className = '', style = {}, ...rest }: IconProps) => (
  <svg
    className={classNames(styles.icon, styles[size], className)}
    style={style}
    viewBox="0 0 24 24"
    {...rest}
    role="img"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="none" fillRule="evenodd">
      <rect width="24" height="24" />
      <path
        fill="currentColor"
        d="M10,10 C7.790861,10 6,11.790861 6,14 C6,16.209139 7.790861,18 10,18 L14,18 L14,20 L9.96363636,20 L9.81199973,19.9980989 C6.58689824,19.9171471 4,17.261126 4,14 C4,10.738874 6.58689824,8.08285293 9.81199973,8.00190107 L15.5,8 L12,4.5 L13.5,3 L19.5,9 L13.5,15 L12,13.5 L15.5,10 L10,10 Z"
      />
    </g>
  </svg>
);
