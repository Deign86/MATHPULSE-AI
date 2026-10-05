import pandas as pd

import main


def test_provisioning_uses_first_and_last_name_not_middle_initial():
    parsed = main._parse_provisioning_dataframe(
        pd.DataFrame(
            [{"First Name": "Avery", "Middle Initial": "B", "Last Name": "Santos", "LRN": "123456789012"}]
        )
    )

    row = parsed["rows"][0]
    assert main._student_import_full_name(row) == "Avery Santos"


def test_duplicate_lrns_report_source_rows_and_reject_entire_batch():
    parsed = main._parse_provisioning_dataframe(
        pd.DataFrame(
            [
                {"First Name": "Avery", "Last Name": "Santos", "LRN": "123456789012"},
                {"First Name": "Blair", "Last Name": "Reyes", "LRN": "123456789012"},
                {"First Name": "Casey", "Last Name": "Lim", "LRN": "210987654321"},
            ]
        )
    )

    assert main._duplicate_student_lrn_rows(parsed["rows"]) == {
        "123456789012": [2, 3]
    }
