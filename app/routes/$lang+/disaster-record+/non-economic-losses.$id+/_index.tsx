import { dr } from '~/db.server';
import { authActionWithPerm, authLoaderWithPerm } from '~/utils/auth';
import { MainContainer } from '~/frontend/container';
import type { MetaFunction } from 'react-router';
import { PropRecord, upsertRecord, nonecoLossesById } from '~/backend.server/models/noneco_losses';

import { useLoaderData, Form, useSubmit, useNavigation, useActionData } from 'react-router';

import { useState, useEffect, useRef, RefObject } from 'react';

import { ContentPicker } from '~/components/ContentPicker';
import { contentPickerConfigCategory } from '../content-picker-config';
import { redirectLangFromRoute } from '~/utils/url.backend';

import { ViewContext } from "~/frontend/context";
import { BackendContext } from '~/backend.server/context';
import { htmlTitle } from '~/utils/htmlmeta';

export const meta: MetaFunction = () => {
  const ctx = new ViewContext();

  return [
    {
      title: htmlTitle(ctx, ctx.t({
        "code": "meta.non_economic_losses_disaster_records",
        "msg": "Non-economic losses - Disaster records"
      })),
    },
    {
      name: "description",
      content: ctx.t({
        "code": "meta.non_economic_losses_disaster_records",
        "msg": "Non-economic losses - Disaster records"
      }),
    }
  ];
};

export const loader = authLoaderWithPerm('EditData', async (loaderArgs) => {
  const ctx = new BackendContext(loaderArgs);
  const { params } = loaderArgs;
  const req = loaderArgs.request;
  let categoryDisplayName: string = '';

  // Parse the request URL
  const parsedUrl = new URL(req.url);

  // Extract query string parameters
  const queryParams = parsedUrl.searchParams;
  const xId = queryParams.get('id') || '';
  let record: any = {};
  let formAction = 'new';
  if (xId) {
    record = await nonecoLossesById(xId);
    formAction = 'edit';
  }
  if (record) {
    categoryDisplayName = await contentPickerConfigCategory(ctx).selectedDisplay(dr, record.categoryId);
  }

  return {

    ok: 'loader',
    record: record,
    categoryDisplayName: categoryDisplayName,
    disRecId: params.id,
    formAction: formAction,
  };
});

export const action = authActionWithPerm('EditData', async (actionArgs) => {
  const { params } = actionArgs;
  const req = actionArgs.request;
  const formData = await req.formData();
  let frmId = formData.get('id') || '';
  let frmCategoryId = formData.get('categoryId')?.toString() || '';
  let frmDescription = formData.get('description') || '';
  let this_showForm: boolean = false;

  if (frmCategoryId && frmCategoryId !== '') {
    this_showForm = true;
  }

  if (this_showForm && frmDescription.toString() !== '') {
    const formRecord: PropRecord = {
      id: frmId && typeof frmId == 'string' ? frmId : undefined,
      categoryId: frmCategoryId,
      disasterRecordId: String(params.id),
      description: String(frmDescription),
    };

    try {
      await upsertRecord(formRecord).catch(console.error);
      return redirectLangFromRoute(actionArgs, '/disaster-record/edit/' + params.id);
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  return {
    ok: 'action',
    showForm: this_showForm,
  };
});

export default function Screen() {
  const loaderData = useLoaderData<typeof loader>();
  const ctx = new ViewContext();
  const actionData = useActionData<typeof action>();

  const submit = useSubmit();
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const formRefHidden: RefObject<HTMLInputElement | null> = useRef(null);
  const formRefSubmit: RefObject<HTMLButtonElement | null> = useRef(null);
  const formAction = loaderData?.formAction || 'new';

  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (actionData?.showForm !== undefined) {
      setShowForm(actionData.showForm);
    }
  }, [actionData]);

  return (
    <MainContainer title={ctx.t({
      "code": "disaster_record.disaster_records_non_economic_losses",
      "msg": "Disaster records: non-economic losses"
    })}>
      <>
        <a data-discover="true" href={ctx.url(`/disaster-record/edit/${loaderData.disRecId}`)}>
          {ctx.t({
            "code": "disaster_record.back",
            "msg": "Back to disaster record"
          })}
        </a>
        <div className="dts-form__intro">
          <h2 className="dts-heading-2">
            {ctx.t({
              "code": "disaster_record.non_economic_losses.effects",
              "msg": "Effects on non-economic losses"
            })}
          </h2>
        </div>
        <Form
          className="dts-form"
          ref={formRef}
          name="frmFilter"
          id="frmFilter"
          method="post"
          onSubmit={(event) => submit(event.currentTarget)}
        >
          <input type="hidden" name="id" value={loaderData.record.id} readOnly={true} />
          <input ref={formRefHidden} type="hidden" name="action" defaultValue="" />

          {/* //#Category: Added ContentPicker */}
          <div className="mg-grid mg-grid__col-auto">
            <div className="form-field">
              <label>
                <div>
                  <ContentPicker ctx={ctx}
                    {...contentPickerConfigCategory(ctx)}
                    value={
                      loaderData.record && loaderData.record.categoryId
                        ? String(loaderData.record.categoryId)
                        : ''
                    } //Assign the sector id here
                    displayName={loaderData.categoryDisplayName} //Assign the sector name here, from the loaderData > sectorDisplayName sample
                    onSelect={(selectedItems: any) => {
                      //This is where you can get the selected sector id

                      console.log('selectedItems: ', selectedItems);

                      setShowForm(true);
                    }}
                    disabledOnEdit={formAction === 'edit'}
                  />
                </div>
              </label>
            </div>
          </div>
          {/* //#Category: End */}

          {((loaderData.record && loaderData.record.id) || actionData?.showForm || showForm) && (
            <>
              <div>
                <label>
                  <div className="dts-form-component__label">
                    <span>* {ctx.t({
                      "code": "common.description",
                      "msg": "Description"
                    })}</span>
                  </div>
                  <textarea
                    name="description"
                    required
                    rows={5}
                    maxLength={3000}
                    defaultValue={
                      loaderData.record && loaderData.record.id ? loaderData.record.description : ''
                    }
                    placeholder={ctx.t({
                      "code": "disaster_record.non_economic_losses.describe_effect_criteria",
                      "msg": "Describe the effect of the non-economic losses to the selected criteria."
                    })}
                    style={{ width: '100%', height: '200px' }}
                  ></textarea>
                </label>
              </div>
              <div className="dts-form__actions">
                <button
                  name="submit_btn"
                  value={'form'}
                  ref={formRefSubmit}
                  className="mg-button mg-button-primary"
                  type="submit"
                  disabled={navigation.state === 'submitting'}
                >
                  {ctx.t({
                    "code": "common.save_changes",
                    "msg": "Save changes"
                  })}
                </button>
              </div>
            </>
          )}
        </Form>
      </>
    </MainContainer>
  );
}
