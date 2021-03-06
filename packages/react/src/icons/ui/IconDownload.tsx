import React from 'react';

import { IconProps } from '../Icon.interface';
import classNames from '../../utils/classNames';
import styles from '../Icon.module.css';

export const IconDownload = ({ size = 's', className = '', style = {}, ...rest }: IconProps) => (
  <svg
    className={classNames(styles.icon, styles[size], className)}
    style={style}
    viewBox="0 0 24 24"
    {...rest}
    role="img"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill="none" fillRule="evenodd">
      <path d="M0 0h24v24H0z" />
      <path
        d="M5 15v5h14v-5h2v7H3v-7h2zm8-13v12.24L16.243 11l1.414 1.414L12 18.071l-5.657-5.657L7.757 11 11 14.242V2h2z"
        fill="currentColor"
      />
    </g>
  </svg>
);
