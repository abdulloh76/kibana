/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBadge,
  EuiFlexItem,
  useInnerText,
  EuiTextColor,
  EuiPopover,
  EuiContextMenu,
  EuiIcon,
  EuiContextMenuPanelDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { groupBy } from 'lodash';
import React, { FC, useState } from 'react';
import { Filter, toggleFilterDisabled } from '@kbn/es-query';
import { FILTERS } from '../../../common';
import { existsOperator, isOneOfOperator } from './filter_editor/lib/filter_operators';
import { IIndexPattern } from '../..';
import { getDisplayValueFromFilter, getIndexPatternFromFilter } from '../../query';
import { SavedQueryMeta, SaveQueryForm } from '../saved_query_form';
import { SavedQueryService } from '../..';

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

export type FilterLabelStatus =
  | typeof FILTER_ITEM_OK
  | typeof FILTER_ITEM_WARNING
  | typeof FILTER_ITEM_ERROR;

interface LabelOptions {
  title: string;
  status: FilterLabelStatus;
  message?: string;
}

interface Props {
  groupedFilters: any;
  indexPatterns: IIndexPattern[];
  onClick: (filter: Filter) => void;
  onRemove: (groupId: string) => void;
  groupId: string;
  filtersGroupsCount: number;
  onUpdate?: (filters: Filter[], groupId: string, toggleNegate: boolean) => void;
  savedQueryService?: SavedQueryService;
  onFilterSave?: (savedQueryMeta: SavedQueryMeta, saveAsNew?: boolean) => Promise<void>;
  customLabel?: string;
  onFilterBadgeSave?: (groupId: number, alias: string) => void;
}

export const FilterExpressionItem: FC<Props> = ({
  groupedFilters,
  indexPatterns,
  onClick,
  onRemove,
  groupId,
  filtersGroupsCount,
  onUpdate,
  savedQueryService,
  onFilterSave,
  customLabel,
  onFilterBadgeSave,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const filters: Filter[] = groupedFilters.map((filter: Filter) => ({
    $state: filter.$state,
    meta: filter.meta,
    query: filter.query,
  }));
  function handleBadgeClick() {
    // if (e.shiftKey) {
    //   onToggleDisabled();
    // } else {
    //   setIsPopoverOpen(!isPopoverOpen);
    // }
    setIsPopoverOpen(!isPopoverOpen);
  }

  function onDuplicate() {
    const multipleUpdatedFilters = groupedFilters?.map((filter: Filter) => {
      return { ...filter, groupId: filtersGroupsCount + 1 };
    });
    const finalFilters = [...multipleUpdatedFilters, ...groupedFilters];
    onUpdate?.(finalFilters, groupId, false);
  }

  function onToggleNegated() {
    const isNegated = groupedFilters[0].groupNegated;
    const multipleUpdatedFilters = groupedFilters?.map((filter: Filter) => {
      return { ...filter, groupNegated: !isNegated };
    });

    onUpdate?.(multipleUpdatedFilters, groupId, true);
  }

  function onToggleDisabled() {
    const multipleUpdatedFilters = groupedFilters?.map(toggleFilterDisabled);
    onUpdate?.(multipleUpdatedFilters, groupId, true);
  }

  function getPanels() {
    const mainPanelItems = [
      {
        name: i18n.translate('data.filter.filterBar.editFilterButtonLabel', {
          defaultMessage: `Edit`,
        }),
        icon: 'pencil',
        panel: 1,
        'data-test-subj': 'editFilter',
      },
      {
        name: i18n.translate('data.filter.filterBar.invertFilterButtonLabel', {
          defaultMessage: `Invert`,
        }),
        icon: 'invert',
        onClick: () => {
          setIsPopoverOpen(false);
          onToggleNegated();
        },
        'data-test-subj': 'negateFilter',
      },
      {
        name: i18n.translate('data.filter.filterBar.duplicateFilterButtonLabel', {
          defaultMessage: `Duplicate`,
        }),
        icon: 'copy',
        onClick: () => {
          setIsPopoverOpen(false);
          onDuplicate();
        },
        'data-test-subj': 'negateFilter',
      },
      {
        name: groupedFilters[0].meta.disabled
          ? i18n.translate('data.filter.filterBar.enableFilterButtonLabel', {
              defaultMessage: `Re-enable`,
            })
          : i18n.translate('data.filter.filterBar.disableFilterButtonLabel', {
              defaultMessage: `Temporarily disable`,
            }),
        icon: `${groupedFilters[0].meta.disabled ? 'eye' : 'eyeClosed'}`,
        onClick: () => {
          setIsPopoverOpen(false);
          onToggleDisabled();
        },
        'data-test-subj': 'disableFilter',
      },
      {
        name: i18n.translate('data.filter.filterBar.deleteFilterButtonLabel', {
          defaultMessage: `Remove`,
        }),
        icon: 'trash',
        onClick: () => {
          setIsPopoverOpen(false);
          onRemove(groupId);
        },
        'data-test-subj': 'deleteFilter',
      },
    ];

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        items: mainPanelItems,
      },
      // {
      //   id: 1,
      //   width: FILTER_EDITOR_WIDTH,
      //   content: (
      //     <div>
      //       <FilterEditor
      //         filter={filter}
      //         indexPatterns={indexPatterns}
      //         onSubmit={onSubmit}
      //         onCancel={() => {
      //           setIsPopoverOpen(false);
      //         }}
      //         timeRangeForSuggestionsOverride={props.timeRangeForSuggestionsOverride}
      //       />
      //     </div>
      //   ),
      // },
    ];

    if (!customLabel && savedQueryService && onFilterSave && onFilterBadgeSave) {
      const saveAsFilterPanelItem = {
        name: i18n.translate('data.filter.filterBar.saveAsFilterButtonLabel', {
          defaultMessage: `Save as filter`,
        }),
        icon: 'save',
        panel: 2,
        'data-test-subj': 'saveAsFilter',
      };

      const saveAsFilterPanelContent = {
        id: 2,
        title: i18n.translate('data.filter.filterBar.saveAsFilterButtonLabel', {
          defaultMessage: `Save as filter`,
        }),
        content: (
          <div style={{ padding: 16 }}>
            <SaveQueryForm
              savedQueryService={savedQueryService}
              onSave={(savedQueryMeta) => {
                onFilterSave(savedQueryMeta, true);
                setIsPopoverOpen(false);
              }}
              onClose={() => setIsPopoverOpen(false)}
              showTimeFilterOption={false}
              showFilterOption={false}
              filters={filters}
              onFilterBadgeSave={(alias: string) => onFilterBadgeSave(Number(groupId), alias)}
            />
          </div>
        ),
      };

      mainPanelItems.splice(mainPanelItems.length - 1, 0, saveAsFilterPanelItem);
      panels.push(saveAsFilterPanelContent);
    }

    return panels;
  }
  /**
   * Checks if filter field exists in any of the index patterns provided,
   * Because if so, a filter for the wrong index pattern may still be applied.
   * This function makes this behavior explicit, but it needs to be revised.
   */
  function isFilterApplicable(filter: Filter) {
    // Any filter is applicable if no index patterns were provided to FilterBar.
    if (!indexPatterns.length) return true;

    const ip = getIndexPatternFromFilter(filter, indexPatterns);
    if (ip) return true;

    const allFields = indexPatterns.map((indexPattern) => {
      return indexPattern.fields.map((field) => field.name);
    });
    const flatFields = allFields.reduce((acc: string[], it: string[]) => [...acc, ...it], []);
    return flatFields.includes(filter.meta?.key || '');
  }

  function getValueLabel(filter: Filter): LabelOptions {
    const label: LabelOptions = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };

    if (filter.meta?.isMultiIndex) {
      return label;
    }

    if (isFilterApplicable(filter)) {
      try {
        label.title = getDisplayValueFromFilter(filter, indexPatterns);
      } catch (e) {
        label.status = FILTER_ITEM_ERROR;
        label.title = i18n.translate('data.filter.filterBar.labelErrorText', {
          defaultMessage: `Error`,
        });
        label.message = e.message;
      }
    } else {
      label.status = FILTER_ITEM_WARNING;
      label.title = i18n.translate('data.filter.filterBar.labelWarningText', {
        defaultMessage: `Warning`,
      });
      label.message = i18n.translate('data.filter.filterBar.labelWarningInfo', {
        defaultMessage: 'Field {fieldName} does not exist in current view',
        values: { fieldName: filter.meta?.key },
      });
    }

    return label;
  }

  const isDisabled = (labelConfig: LabelOptions, filter: Filter) => {
    const { disabled } = filter.meta;
    return disabled || labelConfig.status === FILTER_ITEM_ERROR;
  };

  const getValue = (text?: string) => {
    return (
      <span
        className={
          text && isNaN(text as any)
            ? 'globalFilterExpression__value'
            : 'globalFilterExpression__value--number'
        }
      >
        {text}
      </span>
    );
  };

  const getFilterContent = (
    filter: Filter,
    label: LabelOptions,
    prefix: string | JSX.Element,
    relationship: string
  ) => {
    switch (filter.meta.type) {
      case FILTERS.EXISTS:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(`${existsOperator.message}`)}
            {relationship && (
              <EuiTextColor
                className="globalFilterExpression__relationship"
                color="rgb(0, 113, 194)"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.PHRASES:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(`${isOneOfOperator.message} ${label.title}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.QUERY_STRING:
        return (
          <>
            {prefix}
            {getValue(`${label.title}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      case FILTERS.PHRASE:
      case FILTERS.RANGE:
        return (
          <>
            {prefix}
            {filter.meta.key}: {getValue(label.title)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
      default:
        return (
          <>
            {prefix}
            {getValue(`${JSON.stringify(filter.query) || filter.meta.value}`)}
            {relationship && (
              <EuiTextColor
                color="rgb(0, 113, 194)"
                className="globalFilterExpression__relationship"
              >
                {relationship}
              </EuiTextColor>
            )}
          </>
        );
    }
  };

  const [ref] = useInnerText();
  let filterText = '';
  const filterExpression: JSX.Element[] = [];
  const isGroupNegated = groupedFilters[0].groupNegated ?? false;
  const groupNegatedPrefix = isGroupNegated ? (
    <EuiTextColor color="danger" className="globalFilterExpression__groupNegate">
      NOT
    </EuiTextColor>
  ) : null;
  if (isGroupNegated && groupNegatedPrefix) {
    filterExpression.push(groupNegatedPrefix);
  }
  const groupBySubgroups = groupBy(groupedFilters, 'subGroupId');
  for (const [_, subGroupedFilters] of Object.entries(groupBySubgroups)) {
    const needsParenthesis = subGroupedFilters.length > 1;
    if (needsParenthesis) {
      filterExpression.push(<EuiTextColor color="rgb(0, 113, 194)">(</EuiTextColor>);
    }
    for (const filter of subGroupedFilters) {
      const label = getValueLabel(filter);

      const prefixText = filter.meta.negate
        ? ` ${i18n.translate('data.filter.filterBar.negatedFilterPrefix', {
            defaultMessage: 'NOT ',
          })}`
        : '';
      const prefix =
        filter.meta.negate && !filter.meta.disabled ? (
          <EuiTextColor color="danger">{prefixText}</EuiTextColor>
        ) : (
          prefixText
        );
      const relationship = groupedFilters.length > 1 ? filter.relationship || '' : '';

      const filterContent = getFilterContent(filter, label, prefix, relationship);
      filterExpression.push(filterContent);

      const text = label.title;
      filterText += `${filter?.meta?.key}: ${text} ${
        groupedFilters.length > 1 ? filter.relationship || '' : ''
      } `;
    }
    if (needsParenthesis) {
      filterExpression.push(<EuiTextColor color="rgb(0, 113, 194)">)</EuiTextColor>);
    }
  }

  const badge = (
    <EuiFlexItem key={groupId} className="globalFilterExpression__flexItem">
      <EuiBadge
        title={filterText}
        color="hollow"
        iconType="cross"
        iconSide="right"
        style={{ cursor: 'pointer', padding: '5px' }}
        closeButtonProps={{
          tabIndex: -1,
        }}
        className={
          isDisabled(getValueLabel(groupedFilters[0]), groupedFilters[0])
            ? 'globalFilterExpression-isDisabled'
            : ''
        }
        iconOnClick={() => onRemove(groupId)}
        iconOnClickAriaLabel={i18n.translate('data.filter.filterBar.filteradgeIconAriaLabel', {
          defaultMessage: 'Remove {title}',
          values: { title: filterText },
        })}
        onClickAriaLabel={i18n.translate('data.filter.filterBar.filteradgeClickIconAriaLabel', {
          defaultMessage: 'Filter actions',
        })}
        onClick={handleBadgeClick}
      >
        <div ref={ref}>
          {customLabel ? (
            <>
              <EuiIcon type="save" />
              {customLabel}
            </>
          ) : (
            filterExpression.map((expression) => {
              return <>{expression}</>;
            })
          )}
        </div>
      </EuiBadge>
    </EuiFlexItem>
  );

  return (
    <EuiPopover
      id={`popoverFor_filter${groupId}`}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      button={badge}
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} panels={getPanels()} />
    </EuiPopover>
  );
};
