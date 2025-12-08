import { dr } from '~/db.server';
import { authActionWithPerm, authLoaderWithPerm } from '~/util/auth';
import { MainContainer } from '~/frontend/container';
import type { MetaFunction } from '@remix-run/node';
import { PropRecord, upsertRecord, nonecoLossesById } from '~/backend.server/models/noneco_losses';

import {
  useLoaderData,
  Form,
  useSubmit,
  useNavigation,
  useActionData,
} from '@remix-run/react';

import { useState, useEffect, useRef, RefObject } from 'react';

import { ContentPicker } from '~/components/ContentPicker';
import { contentPickerConfigCategory } from '../content-picker-config';
import { redirectLangFromRoute } from '~/util/url.backend';

import { ViewContext } from "~/frontend/context";
import { getCommonData } from "~/backend.server/handlers/commondata";

// Meta function for page SEO
export const meta: MetaFunction = () => {
  return [
    { title: 'Non-economic losses - Disaster records - DELTA Resilience' },
    { name: 'description', content: 'Non-economic losses page.' },
  ];
};




export const loader = authLoaderWithPerm('EditData', async (loaderArgs) => {
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
    categoryDisplayName = await contentPickerConfigCategory.selectedDisplay(dr, record.categoryId);
  }

  return {
		common: await getCommonData(loaderArgs),
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
	const ctx = new ViewContext(loaderData);
  const actionData = useActionData<typeof action>();

  const submit = useSubmit();
  const navigation = useNavigation();
  const formRef = useRef<HTMLFormElement>(null);
  const formRefHidden: RefObject<HTMLInputElement> = useRef(null);
  const formRefSubmit: RefObject<HTMLButtonElement> = useRef(null);
  const formAction = loaderData?.formAction || 'new';

  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    if (actionData?.showForm !== undefined) {
      setShowForm(actionData.showForm);
    }
  }, [actionData]);

  return (
    <MainContainer title="Disaster records: Non-economic losses">
      <>
        <a data-discover="true" href={ctx.url(`/disaster-record/edit/${loaderData.disRecId}`)}>
          Back to disaster record
        </a>
        <div className="dts-form__intro">
          <h2 className="dts-heading-2">Effects on Non-economic losses</h2>
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
                    {...contentPickerConfigCategory}
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
                    <span>* Description</span>
                  </div>
                  <textarea
                    name="description"
                    required
                    rows={5}
                    maxLength={3000}
                    defaultValue={
                      loaderData.record && loaderData.record.id ? loaderData.record.description : ''
                    }
                    placeholder="Describe the effect of the non-economic losses to the selected criteria."
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
                  Save Changes
                </button>
              </div>
            </>
          )}
        </Form>
      </>
    </MainContainer>
  );
}
