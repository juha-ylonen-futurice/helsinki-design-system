/* eslint-disable @typescript-eslint/ban-ts-ignore */
import React, { useRef, useState, KeyboardEvent, FocusEvent, FocusEventHandler, useMemo, useCallback } from 'react';
import { useCombobox, useMultipleSelection } from 'downshift';
import isEqual from 'lodash.isequal';
import uniqueId from 'lodash.uniqueid';
import { useVirtual } from 'react-virtual';

import 'hds-core';

// import styles from '../select/Select.module.scss';
import styles from './Combobox.module.scss';
import { FieldLabel } from '../../../internal/field-label/FieldLabel';
import classNames from '../../../utils/classNames';
import { IconAlertCircle, IconAngleDown } from '../../../icons';
import { SelectedItems } from '../../../internal/selectedItems/SelectedItems';
import { multiSelectReducer, onMultiSelectStateChange, SelectProps } from '../select';
import {
  DROPDOWN_MENU_ITEM_HEIGHT,
  getIsElementBlurred,
  getIsElementFocused,
  getIsInSelectedOptions,
} from '../dropdownUtils';
import { DropdownMenu } from '../dropdownMenu/DropdownMenu';

type FilterFunction<OptionType> = (options: OptionType[], search: string) => OptionType[];

export type ComboboxProps<OptionType> = SelectProps<OptionType> & {
  /**
   * If provided, this filter function will be used for filtering the
   * combobox suggestions. If this prop is not provided, the default
   * filter implementation is used. The default implementation assumes
   * that the `optionLabelField` prop points to a string value that it
   * can compare with the search value.
   */
  filter?: FilterFunction<OptionType>;
};

function getDefaultFilter<OptionType>(labelField: string): FilterFunction<OptionType> {
  return (options: OptionType[], search: string) => {
    return options.filter((option) => {
      const label = option[labelField];
      const isLabelString = typeof label === 'string';

      if (!label) {
        // eslint-disable-next-line no-console
        console.warn(`Filtering failed because field ${labelField} could not be found from OptionType`);

        return false;
      }

      if (!isLabelString) {
        // eslint-disable-next-line no-console
        console.warn(`Filtering failed because field ${labelField} has a value that is not a string`);

        return false;
      }

      return label.toLowerCase().startsWith(search.toLowerCase());
    });
  };
}

export const Combobox = <OptionType,>({
  circularNavigation = false,
  className,
  clearable = true,
  clearButtonAriaLabel,
  defaultValue,
  disabled = false,
  error,
  getA11yRemovalMessage = () => '',
  getA11ySelectionMessage = () => '',
  getA11yStatusMessage = () => '',
  helper,
  icon,
  id = uniqueId('hds-combobox-'),
  invalid = false,
  isOptionDisabled,
  label,
  multiselect,
  onBlur = () => null,
  onChange = () => null,
  onFocus = () => null,
  optionLabelField = 'label',
  options = [],
  placeholder,
  required,
  selectedItemRemoveButtonAriaLabel,
  selectedItemSrLabel,
  style,
  value,
  visibleOptions = 5,
  filter: userLandFilter,
}: ComboboxProps<OptionType>) => {
  // const filter = userLandFilter || getDefaultFilter(optionLabelField);

  // flag for whether the component is controlled
  const controlled = multiselect && value !== undefined;
  // selected items container ref
  const selectedItemsContainerRef = useRef<HTMLDivElement>();
  // combobox input ref
  const inputRef = useRef<HTMLInputElement>();
  // menu ref
  const menuRef = React.useRef<HTMLUListElement>();
  // whether active focus is within the dropdown
  const [hasFocus, setFocus] = useState<boolean>(false);
  // Tracks whether any combobox item is being clicked
  const [isClicking, setIsClicking] = useState<boolean>(false);
  // tracks current combobox search value
  const [search, setSearch] = useState<string>('');
  // memorise filtered items and only update them when any of the dependencies change
  const getFilteredItems = useMemo<OptionType[]>(() => {
    const filter = userLandFilter || getDefaultFilter(optionLabelField);
    return filter(options, search);
  }, [options, search, userLandFilter, optionLabelField]);
  // todo: Add virtualize prop
  // todo: Fix virtualization styles, so that they work for both multiselect and combobox
  // virtualize menu items to increase performance
  const virtualizer = useVirtual<HTMLUListElement>({
    size: getFilteredItems.length,
    parentRef: menuRef,
    estimateSize: useCallback(() => DROPDOWN_MENU_ITEM_HEIGHT, []),
    overscan: visibleOptions,
  });

  const focusInput = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // init multi-select
  const {
    activeIndex,
    addSelectedItem,
    getDropdownProps,
    getSelectedItemProps,
    removeSelectedItem,
    reset,
    selectedItems,
    setActiveIndex,
    setSelectedItems: _setSelectedItems,
  } = useMultipleSelection<OptionType>({
    // sets focus on the first selected item when the dropdown is initialized
    defaultActiveIndex: 0,
    initialActiveIndex: 0,
    // set the default value(s) when the dropdown is initialized
    initialSelectedItems: (defaultValue as OptionType[]) ?? [],
    ...(multiselect && value !== undefined && { selectedItems: (value as OptionType[]) ?? [] }),
    getA11yRemovalMessage,
    onSelectedItemsChange({ selectedItems: _selectedItems }) {
      return multiselect && onChange(_selectedItems);
    },
    onStateChange: (changes) =>
      onMultiSelectStateChange<OptionType>(changes, activeIndex, selectedItemsContainerRef.current),
    stateReducer: (state, actionAndChanges) => multiSelectReducer<OptionType>(state, actionAndChanges, controlled),
  });

  // init combobox
  const {
    getItemProps,
    getLabelProps,
    getMenuProps,
    getToggleButtonProps,
    highlightedIndex,
    isOpen,
    selectedItem,
    selectItem,
    getInputProps,
    getComboboxProps,
  } = useCombobox<OptionType>({
    circularNavigation,
    id,
    items: getFilteredItems,
    // items: getFilteredItems(options),
    onInputValueChange: ({ inputValue }) => setSearch(inputValue),
    // a defined value indicates that the dropdown should be controlled
    // don't set selectedItem if it's not, so that downshift can handle the state
    ...(!multiselect && value !== undefined && { selectedItem: value as OptionType }),
    getA11ySelectionMessage,
    getA11yStatusMessage,
    itemToString: (item): string => (item ? item[optionLabelField] ?? '' : ''),
    onHighlightedIndexChange: ({ highlightedIndex: _highlightedIndex }) => virtualizer.scrollToIndex(_highlightedIndex),
    onSelectedItemChange: ({ selectedItem: _selectedItem }) => !multiselect && onChange(_selectedItem),
    onStateChange({ type, selectedItem: _selectedItem }) {
      const { InputBlur, InputKeyDownEnter, ItemClick } = useCombobox.stateChangeTypes;

      if ((type === InputBlur || type === InputKeyDownEnter || type === ItemClick) && multiselect && _selectedItem) {
        getIsInSelectedOptions(selectedItems, _selectedItem)
          ? _setSelectedItems(selectedItems.filter((item) => !isEqual(item, _selectedItem)))
          : addSelectedItem(_selectedItem);
        selectItem(null);
      }
    },
    stateReducer(state, { type, changes }) {
      const { ItemClick } = useCombobox.stateChangeTypes;

      // prevent the menu from being closed when the user selects an item by clicking
      if (type === ItemClick && multiselect) {
        return {
          ...changes,
          isOpen: state.isOpen,
          highlightedIndex: state.highlightedIndex,
        };
      }

      return changes;
    },
  });

  const setSelectedItems = (itemToBeSelected: OptionType) => {
    getIsInSelectedOptions(selectedItems, itemToBeSelected)
      ? _setSelectedItems(selectedItems.filter((item) => !isEqual(item, itemToBeSelected)))
      : addSelectedItem(itemToBeSelected);
  };

  const handleWrapperClick = () => focusInput();

  const ignoreFocusHandlerWhenClickingItem = (handler: FocusEventHandler<HTMLDivElement>) => (
    event: FocusEvent<HTMLDivElement>,
  ) => {
    if (!isClicking) {
      handler(event);
    }
  };

  const handleWrapperFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (getIsElementFocused(e)) {
      setFocus(true);
      onFocus();
    }
  };

  const handleWrapperBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (getIsElementBlurred(e)) {
      setFocus(false);
      onBlur();
    }
  };

  const handleMultiSelectInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ') {
      // Prevent 'Space' from typing a space into the input.
      // @ts-ignore
      e.nativeEvent.preventDownshiftDefault = true;

      // Only select an item if an index is highlighted
      if (highlightedIndex > -1) {
        const highlightedItem = getFilteredItems[highlightedIndex];
        // const highlightedItem = getFilteredItems(options)[highlightedIndex];

        setSelectedItems(highlightedItem);
      }
    }

    // If the menu is open, prevent the events for dropdown from firing.
    if (isOpen && (e.key === 'Backspace' || e.key === 'ArrowLeft')) {
      // @ts-ignore
      e.nativeEvent.preventDownshiftDefault = true;
    }
  };

  if (!multiselect) {
    // we call the getDropdownProps getter function when multiselect isn't enabled
    // in order to suppress the "You forgot to call the ..." error message thrown by downshift.
    // we only need to apply the getter props to the toggle button when multiselect is enabled.
    getDropdownProps({}, { suppressRefError: true });
  }

  // show placeholder if no value is selected
  const showPlaceholder = (multiselect && selectedItems.length === 0) || (!multiselect && !selectedItem);
  // Input should be show when the combobox is open, or when it's
  // closed, but no items are selected. The input should always be
  // visible when multiselect mode is turned off.
  const isInputVisible = !multiselect || isOpen || (!isOpen && selectedItems.length === 0);

  return (
    <div
      className={classNames(
        styles.root,
        invalid && styles.invalid,
        disabled && styles.disabled,
        isOpen && styles.open,
        multiselect && styles.multiselect,
        className,
      )}
      style={style}
    >
      {/* LABEL */}
      {label && <FieldLabel label={label} {...getLabelProps()} />}
      {
        // This onClick function is used so that mouse users are able to
        // focus the Combobox without having to use the keyboard. The
        // design calls for the input to be visually hidden until the
        // user gives indication of wanting to access it.
        // Keyboard and screen reader users will move through the
        // selected items list and the clear button, after which they
        // will find the input. It's assumed that mouse users can
        // consume this information all at once and it's hence
        // convenient to offer direct access to the input by clicking.
        // In turn, providing this element as a focusable element would
        // add one more item keyboard/screen reader users would need to
        // move through.
      }
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
      <div
        // When a user clicks on a combobox item, the focus on the page
        // is momentarily lost. This will cause an event to fire which
        // has its 'relatedTarget' field set as 'null'. An event like
        // this looks exactly like a valid blur/focus event could look
        // like. We can not distinct this scenario in the blur/focus
        // handler.

        // If we allow blur/focus to fire, the input will briefly be
        // displayed as unfocused, which makes the selected items list
        // limit its visible options, which in turn changes the dropdown
        // position, which in turn makes selecting an item by click
        // almost impossible.

        // As a hackfix, we track whether any item is being clicked in
        // the components state. If an item is clicked, we do not call
        // the blur/focus handlers at all.
        onFocus={ignoreFocusHandlerWhenClickingItem(handleWrapperFocus)}
        onBlur={ignoreFocusHandlerWhenClickingItem(handleWrapperBlur)}
        // onClick={handleWrapperClick}
        className={classNames(styles.wrapper)}
      >
        {/* SELECTED ITEMS */}
        {multiselect && selectedItems.length > 0 && (
          <SelectedItems
            activeIndex={activeIndex}
            clearable={clearable}
            clearButtonAriaLabel={clearButtonAriaLabel}
            dropdownId={id}
            getSelectedItemProps={getSelectedItemProps}
            hideItems={!hasFocus}
            onClear={() => reset()}
            onRemove={removeSelectedItem}
            optionLabelField={optionLabelField}
            removeButtonAriaLabel={selectedItemRemoveButtonAriaLabel}
            selectedItems={selectedItems}
            selectedItemSrLabel={selectedItemSrLabel}
            selectedItemsContainerRef={selectedItemsContainerRef}
            setActiveIndex={setActiveIndex}
          />
        )}
        <div {...getComboboxProps()} className={styles.buttonInputStack}>
          <input
            {...getInputProps({
              ...(invalid && { 'aria-invalid': true }),
              ...(multiselect && {
                ...getDropdownProps({
                  // Change Downshift's default behavior with space.
                  // Instead of typing a space character into the
                  // search input, it now selects an item without
                  // closing the dropdown menu.

                  // Our custom keyDown handler also blocks other
                  // dropdown key events when the menu is open. This
                  // would normally be done with the
                  // 'preventKeyAction' setting, but it would also
                  // block our custom handler from executing, which
                  // would break the special behavior we have
                  // implemented for space. We want to block other key
                  // actions in order to ensure that dropdown and
                  // input props don't conflict.
                  onKeyDown: handleMultiSelectInputKeyDown,
                  ref: inputRef,
                }),
              }),
            })}
            placeholder={placeholder}
            className={classNames(styles.input, isInputVisible ? '' : styles.hidden)}
          />
          {/* <div className={styles.inputWrapper}>
             icons are only supported by single selects 
            {icon && !multiselect && <span className={classNames(styles.icon, styles.inputIcon)}>{icon}</span>}
             INPUT 
            <input
              {...getInputProps({
                ...(invalid && { 'aria-invalid': true }),
                ...(multiselect && {
                  ...getDropdownProps({
                    // Change Downshift's default behavior with space.
                    // Instead of typing a space character into the
                    // search input, it now selects an item without
                    // closing the dropdown menu.
          
                    // Our custom keyDown handler also blocks other
                    // dropdown key events when the menu is open. This
                    // would normally be done with the
                    // 'preventKeyAction' setting, but it would also
                    // block our custom handler from executing, which
                    // would break the special behavior we have
                    // implemented for space. We want to block other key
                    // actions in order to ensure that dropdown and
                    // input props don't conflict.
                    onKeyDown: handleMultiSelectInputKeyDown,
                    ref: inputRef,
                  }),
                }),
              })}
              placeholder={placeholder}
              className={classNames(styles.input, isInputVisible ? '' : styles.hidden)}
            />
          </div> */}
          {/* TOGGLE BUTTON */}
          <button
            type="button"
            {...getToggleButtonProps({
              // todo: button label
              // 'aria-labelledby': buttonAriaLabel,
              disabled,
              className: classNames(
                styles.button,
                showPlaceholder && styles.placeholder,
                !showPlaceholder && styles.noPadding,
              ),
            })}
          >
            <IconAngleDown className={styles.angleIcon} />
          </button>
        </div>
        {/* MENU */}
        <DropdownMenu
          getItemProps={(optionDisabled, index, item, selected, virtualRow) =>
            getItemProps({
              item,
              index,
              disabled: optionDisabled,
              className: classNames(
                styles.menuItem,
                highlightedIndex === index && styles.highlighted,
                selected && styles.selected,
                optionDisabled && styles.disabled,
              ),
              onMouseDown: () => {
                setIsClicking(true);
              },
              // We can't use 'onMouseDown' because it is fired
              // before 'onClick' which is too soon for us. Using
              // 'onClick' creates a niche case where it's
              // possible that the user fails to complete their
              // click. In other words, they mouse down on a
              // different element than they mouse up on. In this
              // scenario, the blur/focus events will be ignored
              // until the next successful click.
              onClick: () => {
                setIsClicking(false);
              },
              // todo: comment
              ...(virtualRow && {
                style: {
                  transform: `translateY(${virtualRow.start}px`,
                },
                ref: virtualRow.measureRef,
              }),
            })
          }
          isOptionDisabled={isOptionDisabled}
          menuProps={getMenuProps({
            ...(multiselect && { 'aria-multiselectable': true }),
            ...(required && { 'aria-required': true }),
            // className: classNames(styles.menu, options.length > visibleOptions && styles.overflow),
            style: { maxHeight: DROPDOWN_MENU_ITEM_HEIGHT * visibleOptions },
            ref: menuRef,
          })}
          menuStyles={styles}
          multiselect={multiselect}
          open={isOpen}
          optionLabelField={optionLabelField}
          options={getFilteredItems}
          // options={getFilteredItems(options)}
          selectedItem={selectedItem}
          selectedItems={selectedItems}
          virtualizer={virtualizer}
          visibleOptions={visibleOptions}
        />
      </div>
      {/* INVALID TEXT */}
      {invalid && error && (
        <div id={`${id}-error`} className={styles.errorText} aria-hidden="true">
          <IconAlertCircle className={styles.invalidIcon} />
          {error}
        </div>
      )}
      {/* HELPER TEXT */}
      {helper && (
        <div id={`${id}-helper`} className={styles.helperText} aria-hidden="true">
          {helper}
        </div>
      )}
    </div>
  );
};
